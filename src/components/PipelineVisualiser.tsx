import React, { useMemo, useRef, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { usePipelineData } from '../hooks/usePipelineData';
import { PipelineFlow } from './PipelineFlow';

// Golden angle (~137.5°) spacing gives maximum perceptual separation
// between consecutive colours — works for any number of environments.
function getSharedEnvColor(index: number): string {
    const hue = Math.round((index * 137.508) % 360);
    return `hsl(${hue}, 60%, 42%)`;
}

interface PipelineVisualiserProps {
    connection: ToolBoxAPI.DataverseConnection | null;
}

export const PipelineVisualiser: React.FC<PipelineVisualiserProps> = ({ connection }) => {
    const { pipelines, isLoading, error, refresh } = usePipelineData(connection);
    const exportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = useCallback(async () => {
        if (!exportRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(exportRef.current, {
                backgroundColor: '#f3f4f6',
                scale: 2, // 2× for sharper output on high-DPI screens
                useCORS: true,
                logging: false,
            });
            const link = document.createElement('a');
            link.download = `pipelines-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } finally {
            setIsExporting(false);
        }
    }, []);

    // Count how many pipelines each environment appears in
    const envPipelineCount = useMemo(() => {
        const count = new Map<string, number>();
        for (const pipeline of pipelines) {
            const envIds = new Set<string>();
            if (pipeline.developmentEnvironment?.id) envIds.add(pipeline.developmentEnvironment.id);
            for (const stage of pipeline.stages) {
                if (stage.environment?.id) envIds.add(stage.environment.id);
            }
            for (const id of envIds) {
                count.set(id, (count.get(id) ?? 0) + 1);
            }
        }
        return count;
    }, [pipelines]);

    // Assign a unique accent colour to environments shared across 2+ pipelines
    const sharedColors = useMemo(() => {
        const colors = new Map<string, string>();
        let colorIdx = 0;
        for (const [id, count] of envPipelineCount) {
            if (count > 1) {
                colors.set(id, getSharedEnvColor(colorIdx++));
            }
        }
        return colors;
    }, [envPipelineCount]);

    const hasShared = sharedColors.size > 0;

    return (
        <div className="card">
            <div className="visualiser-header">
                <h2>🚀 Pipelines</h2>
                <div className="visualiser-header__actions">
                    {pipelines.length > 0 && !isLoading && (
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="btn btn-secondary"
                            title="Export as PNG image"
                        >
                            {isExporting ? 'Exporting…' : '📷 Export PNG'}
                        </button>
                    )}
                    <button
                        onClick={refresh}
                        disabled={isLoading || !connection}
                        className="btn btn-primary"
                    >
                        {isLoading ? 'Loading…' : '↻ Refresh'}
                    </button>
                </div>
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

            <div ref={exportRef} className="export-region">
                <details className="pipeline-legend">
                    <summary className="pipeline-legend__toggle">Legend &amp; Notes</summary>
                    <div className="pipeline-legend__body">
                        <div className="pipeline-legend__row">
                            <span className="pipeline-legend__label">Recent deployments:</span>
                            <div className="pipeline-legend__dots-row">
                                <span className="deployment-dot" style={{ background: '#22c55e' }} />
                                <span className="pipeline-legend__item">Succeeded</span>
                                <span className="deployment-dot" style={{ background: '#ef4444' }} />
                                <span className="pipeline-legend__item">Failed</span>
                                <span className="deployment-dot" style={{ background: '#eab308' }} />
                                <span className="pipeline-legend__item">Cancelled</span>
                                <span className="deployment-dot" style={{ background: '#d1d5db' }} />
                                <span className="pipeline-legend__item">Other / In Progress</span>
                            </div>
                        </div>
                        {hasShared && (
                            <div className="pipeline-legend__row">
                                <strong>🔗 Shared environments</strong> — matching coloured borders indicate the same environment appears across multiple pipelines.
                            </div>
                        )}
                    </div>
                </details>

                {pipelines.map(pipeline => (
                    <PipelineFlow
                        key={pipeline.id}
                        pipeline={pipeline}
                        sharedColors={sharedColors}
                        envPipelineCount={envPipelineCount}
                    />
                ))}
            </div>
        </div>
    );
};
