import React, { useMemo } from 'react';
import { usePipelineData } from '../hooks/usePipelineData';
import { PipelineFlow } from './PipelineFlow';

// Distinct accent colours for shared environments
const SHARED_ENV_COLORS = [
    '#e67e22', '#27ae60', '#e74c3c', '#f39c12',
    '#1abc9c', '#d35400', '#16a085', '#c0392b',
    '#2980b9', '#8e44ad',
];

interface PipelineVisualiserProps {
    connection: ToolBoxAPI.DataverseConnection | null;
}

export const PipelineVisualiser: React.FC<PipelineVisualiserProps> = ({ connection }) => {
    const { pipelines, isLoading, error, refresh } = usePipelineData(connection);

    // Build a colour map: environments appearing in more than one pipeline
    // get a unique accent colour so they're visually linkable across rows.
    const sharedColors = useMemo(() => {
        const usageCount = new Map<string, number>();
        for (const pipeline of pipelines) {
            const envIds = new Set<string>();
            if (pipeline.developmentEnvironment?.id) envIds.add(pipeline.developmentEnvironment.id);
            for (const stage of pipeline.stages) {
                if (stage.environment?.id) envIds.add(stage.environment.id);
            }
            for (const id of envIds) {
                usageCount.set(id, (usageCount.get(id) ?? 0) + 1);
            }
        }
        const colors = new Map<string, string>();
        let colorIdx = 0;
        for (const [id, count] of usageCount) {
            if (count > 1) {
                colors.set(id, SHARED_ENV_COLORS[colorIdx % SHARED_ENV_COLORS.length]);
                colorIdx++;
            }
        }
        return colors;
    }, [pipelines]);

    const hasShared = sharedColors.size > 0;

    return (
        <div className="card">
            <div className="visualiser-header">
                <h2>🚀 Pipelines</h2>
                <button
                    onClick={refresh}
                    disabled={isLoading || !connection}
                    className="btn btn-primary"
                >
                    {isLoading ? 'Loading…' : '↻ Refresh'}
                </button>
            </div>

            {!connection && (
                <div className="info-box warning">
                    <p>⚠️ Connect to a Dataverse environment to view pipelines.</p>
                </div>
            )}

            {connection && isLoading && (
                <div className="info-box">
                    <div className="loading">Loading pipelines…</div>
                </div>
            )}

            {error && (
                <div className="info-box error">
                    <p><strong>Error:</strong> {error}</p>
                </div>
            )}

            {!isLoading && !error && connection && pipelines.length === 0 && (
                <div className="info-box">
                    <p>No deployment pipelines found in this environment.</p>
                </div>
            )}

            {hasShared && (
                <div className="info-box shared-legend">
                    <strong>🔗 Shared environments</strong> — matching coloured borders indicate the same environment appears across multiple pipelines.
                </div>
            )}

            {pipelines.map(pipeline => (
                <PipelineFlow key={pipeline.id} pipeline={pipeline} sharedColors={sharedColors} />
            ))}
        </div>
    );
};
