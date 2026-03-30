import { useState, useCallback, useEffect } from 'react';
import type { DeploymentEnvironment, DeploymentStage, DeploymentPipeline } from '../types/pipeline';

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
 */
function orderStages(stages: DeploymentStage[]): DeploymentStage[] {
    if (stages.length <= 1) return stages;

    // Build map: previousStageId -> the stage that follows it
    const afterMap = new Map<string, DeploymentStage>();
    for (const stage of stages) {
        if (stage.previousStageId) {
            afterMap.set(stage.previousStageId, stage);
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
        current = afterMap.get(current.id);
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
            const [rawPipelines, rawStages, rawEnvironments] = await Promise.all([
                fetchPipelinesWithDevEnv(),
                fetchAll('deploymentstage'),
                fetchAll('deploymentenvironment'),
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

                const envMatch = findFirstGuidMatch(raw, new Set(envMap.keys()), usedKeys);
                if (envMatch) usedKeys.add(envMatch.key);

                // Exclude own ID from self-referential matching
                const otherStageIds = new Set([...stageIds].filter(sid => sid !== id));
                const prevMatch = findFirstGuidMatch(raw, otherStageIds, usedKeys);

                stageMap.set(id, {
                    id,
                    name: raw.name ?? raw.stagename ?? `Stage ${stageMap.size + 1}`,
                    pipelineId: pipelineMatch?.value ?? '',
                    environment: envMatch ? (envMap.get(envMatch.value) ?? null) : null,
                    previousStageId: prevMatch?.value ?? null,
                    rawAttributes: raw,
                });
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

                const pipelineStages = [...stageMap.values()].filter(s => s.pipelineId === id);
                const orderedStages = orderStages(pipelineStages);

                result.push({
                    id,
                    name: raw.name ?? raw.pipelinename ?? id,
                    developmentEnvironment: devEnv,
                    stages: orderedStages,
                    rawAttributes: raw,
                });
            }

            setPipelines(result);
        } catch (err) {
            setError(`Failed to load pipeline data: ${(err as Error).message}`);
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
