import { useState, useCallback, useEffect } from 'react';
import type { DeploymentEnvironment, DeploymentStage, DeploymentPipeline, DeploymentStageRun } from '../types/pipeline';

const isGuid = (val: unknown): val is string =>
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

/** Returns the primary key value for a record using standard Dataverse naming (entitynameid). */
function getEntityPrimaryKey(record: Record<string, any>, entityName: string): string {
    const standardKey = `${entityName}id`;
    if (isGuid(record[standardKey])) return record[standardKey];

    // Fallback: first field ending in 'id' containing a GUID
    for (const [key, value] of Object.entries(record)) {
        if (!key.startsWith('@') && key.toLowerCase().endsWith('id') && isGuid(value)) {
            return value;
        }
    }
    return '';
}

/**
 * Scans a record's fields for the first GUID that matches any value in knownIds,
 * ignoring already-used fields and OData annotation keys.
 */
function findFirstGuidMatch(
    record: Record<string, any>,
    knownIds: Set<string>,
    usedKeys: Set<string>
): { key: string; value: string } | null {
    for (const [key, value] of Object.entries(record)) {
        if (usedKeys.has(key) || key.startsWith('@')) continue;
        if (isGuid(value) && knownIds.has(value)) {
            return { key, value };
        }
    }
    return null;
}

/**
 * Orders stages by following the self-referential previousStageId chain.
 * Stage with no previousStageId is first; each subsequent stage points to the previous.
 * Handles duplicate previousStageId references gracefully by keeping the first seen.
 */
function orderStages(stages: DeploymentStage[]): DeploymentStage[] {
    if (stages.length <= 1) return stages;

    // Build map: previousStageId -> stages that follow it (array to handle duplicates)
    const afterMap = new Map<string, DeploymentStage[]>();
    for (const stage of stages) {
        if (stage.previousStageId) {
            const existing = afterMap.get(stage.previousStageId) ?? [];
            existing.push(stage);
            afterMap.set(stage.previousStageId, existing);
        }
    }

    const firstStage = stages.find(s => !s.previousStageId);
    if (!firstStage) return stages;

    const ordered: DeploymentStage[] = [];
    const visited = new Set<string>();
    let current: DeploymentStage | undefined = firstStage;

    while (current && !visited.has(current.id)) {
        ordered.push(current);
        visited.add(current.id);
        // If multiple stages claim the same previous stage, take the first one
        current = afterMap.get(current.id)?.[0];
    }

    // Append any stages not reached via the chain (data integrity fallback)
    for (const stage of stages) {
        if (!visited.has(stage.id)) ordered.push(stage);
    }

    return ordered;
}

async function fetchAll(entityName: string): Promise<Record<string, any>[]> {
    const fetchXml = `<fetch><entity name="${entityName}"><all-attributes /></entity></fetch>`;
    const result = await window.dataverseAPI.fetchXmlQuery(fetchXml);
    return result.value ?? [];
}

/** Fetch the most recent 500 stage runs, joined to deploymentstage (inner join ensures
 *  orphaned runs — i.e. those whose stage was deleted — are never returned). */
async function fetchRecentStageRuns(): Promise<Record<string, any>[]> {
    const fetchXml = `
<fetch top="500">
  <entity name="deploymentstagerun">
    <all-attributes />
    <order attribute="createdon" descending="true" />
    <link-entity name="deploymentstage"
                 from="deploymentstageid"
                 to="deploymentstageid"
                 link-type="inner" />
  </entity>
</fetch>`.trim();
    const result = await window.dataverseAPI.fetchXmlQuery(fetchXml);
    return result.value ?? [];
}

async function fetchPipelinesWithDevEnv(): Promise<Record<string, any>[]> {
    const fetchXml = `
<fetch>
  <entity name="deploymentpipeline">
    <all-attributes />
    <link-entity name="deploymentpipeline_deploymentenvironment"
                 intersect="true"
                 visible="false"
                 from="deploymentpipelineid"
                 to="deploymentpipelineid"
                 link-type="outer">
      <link-entity name="deploymentenvironment"
                   alias="devenv"
                   from="deploymentenvironmentid"
                   to="deploymentenvironmentid"
                   link-type="outer">
        <attribute name="deploymentenvironmentid" />
        <attribute name="name" />
      </link-entity>
    </link-entity>
  </entity>
</fetch>`.trim();
    const result = await window.dataverseAPI.fetchXmlQuery(fetchXml);
    return result.value ?? [];
}

export function usePipelineData(connection: ToolBoxAPI.DataverseConnection | null) {
    const [pipelines, setPipelines] = useState<DeploymentPipeline[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!connection) return;
        setIsLoading(true);
        setError(null);

        try {
            const [rawPipelines, rawStages, rawEnvironments, rawStageRuns] = await Promise.all([
                fetchPipelinesWithDevEnv(),
                fetchAll('deploymentstage'),
                fetchAll('deploymentenvironment'),
                fetchRecentStageRuns(),
            ]);

            // Build environment map: id -> DeploymentEnvironment
            const envMap = new Map<string, DeploymentEnvironment>();
            for (const raw of rawEnvironments) {
                const id = getEntityPrimaryKey(raw, 'deploymentenvironment');
                if (!id) continue;
                envMap.set(id, {
                    id,
                    name: raw.name ?? raw.displayname ?? id,
                    environmentId: raw.environmentid ?? raw.organizationid ?? undefined,
                    environmentType: raw.environmenttype ?? raw.type ?? undefined,
                    rawAttributes: raw,
                });
            }

            // Collect pipeline IDs for GUID matching
            const pipelineIds = new Set<string>();
            for (const raw of rawPipelines) {
                const id = getEntityPrimaryKey(raw, 'deploymentpipeline');
                if (id) pipelineIds.add(id);
            }

            // Collect stage IDs for self-referential GUID matching
            const stageIds = new Set<string>();
            for (const raw of rawStages) {
                const id = getEntityPrimaryKey(raw, 'deploymentstage');
                if (id) stageIds.add(id);
            }

            // Pre-build envIds set once to avoid re-allocating it for every stage
            const envIds = new Set(envMap.keys());

            // Pre-group stages by pipelineId to avoid O(pipelines × stages) filtering later
            const stagesByPipeline = new Map<string, DeploymentStage[]>();

            // Process stages: link to pipeline, environment, and previous stage via GUID matching
            const stageMap = new Map<string, DeploymentStage>();
            for (const raw of rawStages) {
                const id = getEntityPrimaryKey(raw, 'deploymentstage');
                if (!id) continue;

                // Mark primary key field(s) as used so they're excluded from further matching
                const usedKeys = new Set<string>();
                for (const [k, v] of Object.entries(raw)) {
                    if (v === id) usedKeys.add(k);
                }

                const pipelineMatch = findFirstGuidMatch(raw, pipelineIds, usedKeys);
                if (pipelineMatch) usedKeys.add(pipelineMatch.key);

                const envMatch = findFirstGuidMatch(raw, envIds, usedKeys);
                if (envMatch) usedKeys.add(envMatch.key);

                // Self-referential match: reuse stageIds but skip the current stage's own ID
                const prevMatch = findFirstGuidMatch(
                    raw,
                    stageIds,
                    new Set([...usedKeys, id])
                );

                const stage: DeploymentStage = {
                    id,
                    name: raw.name ?? raw.stagename ?? `Stage ${stageMap.size + 1}`,
                    pipelineId: pipelineMatch?.value ?? '',
                    environment: envMatch ? (envMap.get(envMatch.value) ?? null) : null,
                    previousStageId: prevMatch?.value ?? null,
                    rawAttributes: raw,
                };

                stageMap.set(id, stage);

                if (stage.pipelineId) {
                    const group = stagesByPipeline.get(stage.pipelineId) ?? [];
                    group.push(stage);
                    stagesByPipeline.set(stage.pipelineId, group);
                }
            }

            // Process stage runs: link to pipeline via stageMap, group last 5 per pipeline
            // rawStageRuns is already ordered newest-first from the FetchXML
            const runsByPipeline = new Map<string, DeploymentStageRun[]>();
            for (const raw of rawStageRuns) {
                const id = getEntityPrimaryKey(raw, 'deploymentstagerun');
                if (!id) continue;

                const usedKeys = new Set<string>();
                for (const [k, v] of Object.entries(raw)) {
                    if (v === id) usedKeys.add(k);
                }

                // Find the stage this run belongs to via GUID matching
                const stageMatch = findFirstGuidMatch(raw, stageIds, usedKeys);
                const stageId = stageMatch?.value ?? null;
                const pipelineId = stageId ? (stageMap.get(stageId)?.pipelineId ?? null) : null;
                if (!pipelineId) continue;

                const existing = runsByPipeline.get(pipelineId) ?? [];
                if (existing.length >= 5) continue; // Already have 5 for this pipeline

                existing.push({
                    id,
                    stageId,
                    pipelineId,
                    status: raw.stagerunstatus ?? null,
                    artifactName: raw.artifactname ?? null,
                    solutionVersion: raw.solutionartifactversion ?? null,
                    startTime: raw.startedon ?? raw.createdon ?? null,
                    endTime: raw.completedon ?? raw.modifiedon ?? null,
                    rawAttributes: raw,
                });
                runsByPipeline.set(pipelineId, existing);
            }

            // Process pipelines: dev environment comes from aliased devenv.* fields
            // returned by the intersect join in fetchPipelinesWithDevEnv()
            const result: DeploymentPipeline[] = [];

            for (const raw of rawPipelines) {
                const id = getEntityPrimaryKey(raw, 'deploymentpipeline');
                if (!id) continue;

                const usedKeys = new Set<string>();
                for (const [k, v] of Object.entries(raw)) {
                    if (v === id) usedKeys.add(k);
                }

                // Dev environment is returned via the intersect link-entity alias
                const devEnvId: string | undefined = raw['devenv.deploymentenvironmentid'];
                const devEnvName: string | undefined = raw['devenv.name'];
                const devEnv: DeploymentEnvironment | null = devEnvId
                    ? (envMap.get(devEnvId) ?? { id: devEnvId, name: devEnvName ?? devEnvId, rawAttributes: {} })
                    : null;

                const pipelineStages = stagesByPipeline.get(id) ?? [];
                const orderedStages = orderStages(pipelineStages);

                result.push({
                    id,
                    name: raw.name ?? raw.pipelinename ?? id,
                    developmentEnvironment: devEnv,
                    stages: orderedStages,
                    recentRuns: runsByPipeline.get(id) ?? [],
                    rawAttributes: raw,
                });
            }

            setPipelines(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(`Failed to load pipeline data: ${message}`);
        } finally {
            setIsLoading(false);
        }
    }, [connection]);

    useEffect(() => {
        if (connection) {
            loadData();
        } else {
            setPipelines([]);
            setError(null);
        }
    }, [connection, loadData]);

    return { pipelines, isLoading, error, refresh: loadData };
}
