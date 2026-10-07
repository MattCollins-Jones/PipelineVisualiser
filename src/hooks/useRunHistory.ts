import { useState, useCallback, useEffect } from 'react';
import type { DeploymentStageRun, DeploymentStage } from '../types/pipeline';

/** Fetch all stage runs for a specific pipeline, joining to deploymentstage
 *  so we get stage name and environment details in one query. */
async function fetchAllRunsForPipeline(
    pipelineId: string,
    stageMap: Map<string, DeploymentStage>
): Promise<DeploymentStageRun[]> {
    // Collect the stage IDs that belong to this pipeline
    const stageIds: string[] = [];
    for (const [id, stage] of stageMap) {
        if (stage.pipelineId === pipelineId) stageIds.push(id);
    }
    if (stageIds.length === 0) return [];

    // Build a FetchXML condition for each stage ID
    const stageConditions = stageIds
        .map(id => `<condition attribute="deploymentstageid" operator="eq" value="${id}" />`)
        .join('\n        ');

    const fetchXml = `
<fetch>
  <entity name="deploymentstagerun">
    <all-attributes />
    <order attribute="createdon" descending="true" />
    <filter type="or">
      ${stageConditions}
    </filter>
  </entity>
</fetch>`.trim();

    const result = await window.dataverseAPI.fetchXmlQuery(fetchXml);
    const raw: Record<string, any>[] = result.value ?? [];

    const isGuid = (val: unknown): val is string =>
        typeof val === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const stageIdSet = new Set(stageIds);
    const runs: DeploymentStageRun[] = [];

    for (const record of raw) {
        // Find primary key
        let id = record['deploymentstagerunid'] ?? '';
        if (!isGuid(id)) {
            for (const [k, v] of Object.entries(record)) {
                if (!k.startsWith('@') && k.toLowerCase().endsWith('id') && isGuid(v)) {
                    id = v as string;
                    break;
                }
            }
        }
        if (!id) continue;

        // Find which stage this run belongs to
        let stageId: string | null = null;
        for (const [k, v] of Object.entries(record)) {
            if (!k.startsWith('@') && isGuid(v) && stageIdSet.has(v as string)) {
                stageId = v as string;
                break;
            }
        }

        const stage = stageId ? stageMap.get(stageId) : undefined;

        runs.push({
            id,
            stageId,
            stageName: stage?.name ?? null,
            pipelineId,
            targetEnvironmentId: stage?.environment?.id ?? null,
            targetEnvironmentName: stage?.environment?.name ?? null,
            owner: record['_ownerid_value@OData.Community.Display.V1.FormattedValue']
                ?? record['ownerid@OData.Community.Display.V1.FormattedValue']
                ?? record.owneridname
                ?? null,
            status: record.stagerunstatus ?? null,
            artifactName: record.artifactname ?? null,
            solutionVersion: record.solutionartifactversion
                ?? record.solutionversion
                ?? record.artifactversion
                ?? record.msdyn_solutionartifactversion
                ?? record.msdyn_solutionversion
                ?? null,
            startTime: record.startedon ?? record.createdon ?? null,
            endTime: record.completedon ?? record.modifiedon ?? null,
            rawAttributes: record,
        });
    }

    return runs;
}

export function useRunHistory(
    pipelineId: string | null,
    stageMap: Map<string, DeploymentStage>
) {
    const [runs, setRuns] = useState<DeploymentStageRun[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!pipelineId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchAllRunsForPipeline(pipelineId, stageMap);
            setRuns(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    }, [pipelineId, stageMap]);

    useEffect(() => {
        if (pipelineId) load();
        else setRuns([]);
    }, [pipelineId, load]);

    return { runs, isLoading, error, refresh: load };
}
