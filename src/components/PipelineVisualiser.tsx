import React from 'react';
import { usePipelineData } from '../hooks/usePipelineData';
import { PipelineFlow } from './PipelineFlow';

interface PipelineVisualiserProps {
    connection: ToolBoxAPI.DataverseConnection | null;
}

export const PipelineVisualiser: React.FC<PipelineVisualiserProps> = ({ connection }) => {
    const { pipelines, isLoading, error, refresh } = usePipelineData(connection);

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

            {pipelines.map(pipeline => (
                <PipelineFlow key={pipeline.id} pipeline={pipeline} />
            ))}
        </div>
    );
};
