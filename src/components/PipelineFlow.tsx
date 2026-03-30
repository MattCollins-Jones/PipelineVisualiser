import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { DeploymentPipeline } from '../types/pipeline';

interface TooltipState {
    text: string;
    x: number;
    y: number;
}

interface EnvironmentNodeProps {
    envId?: string;
    envName: string;
    stageName?: string;
    isDevelopment?: boolean;
    sharedColor?: string;
    pipelineCount?: number;
}

const EnvironmentNode: React.FC<EnvironmentNodeProps> = ({
    envName,
    stageName,
    isDevelopment,
    sharedColor,
    pipelineCount = 1,
}) => {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    const tooltipText = pipelineCount > 1
        ? `${envName} is part of ${pipelineCount} pipelines`
        : envName;

    const handleMouseEnter = useCallback((e: React.MouseEvent) => {
        setTooltip({ text: tooltipText, x: e.clientX, y: e.clientY });
    }, [tooltipText]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setTooltip(null);
    }, []);

    const sharedStyle: React.CSSProperties = sharedColor
        ? { borderColor: sharedColor, boxShadow: `0 0 0 3px ${sharedColor}55` }
        : {};

    return (
        <>
            <div
                className={`pipeline-node ${isDevelopment ? 'pipeline-node--dev' : 'pipeline-node--target'}`}
                style={sharedStyle}
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {stageName && <div className="pipeline-node__stage-label">{stageName}</div>}
                <div className="pipeline-node__env-name">{envName}</div>
                <span className={`pipeline-node__badge ${isDevelopment ? 'badge--dev' : 'badge--target'}`}>
                    {isDevelopment ? 'Development' : 'Target'}
                </span>
            </div>

            {tooltip && createPortal(
                <div
                    className="pipeline-tooltip"
                    style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
                >
                    {tooltip.text}
                </div>,
                document.body
            )}
        </>
    );
};

interface PipelineFlowProps {
    pipeline: DeploymentPipeline;
    sharedColors: Map<string, string>;
    envPipelineCount: Map<string, number>;
}

export const PipelineFlow: React.FC<PipelineFlowProps> = ({ pipeline, sharedColors, envPipelineCount }) => {
    const hasNodes = pipeline.developmentEnvironment || pipeline.stages.length > 0;

    return (
        <div className="pipeline-card">
            <h3 className="pipeline-card__name">{pipeline.name}</h3>
            <div className="pipeline-flow">
                {pipeline.developmentEnvironment && (
                    <>
                        <EnvironmentNode
                            envId={pipeline.developmentEnvironment.id}
                            envName={pipeline.developmentEnvironment.name}
                            isDevelopment
                            sharedColor={sharedColors.get(pipeline.developmentEnvironment.id)}
                            pipelineCount={envPipelineCount.get(pipeline.developmentEnvironment.id)}
                        />
                        {pipeline.stages.length > 0 && (
                            <div className="pipeline-arrow" aria-hidden="true">→</div>
                        )}
                    </>
                )}

                {pipeline.stages.map((stage, index) => (
                    <React.Fragment key={stage.id}>
                        <EnvironmentNode
                            envId={stage.environment?.id}
                            envName={stage.environment?.name ?? 'Unknown Environment'}
                            stageName={stage.name}
                            sharedColor={stage.environment ? sharedColors.get(stage.environment.id) : undefined}
                            pipelineCount={stage.environment ? envPipelineCount.get(stage.environment.id) : undefined}
                        />
                        {index < pipeline.stages.length - 1 && (
                            <div className="pipeline-arrow" aria-hidden="true">→</div>
                        )}
                    </React.Fragment>
                ))}

                {!hasNodes && (
                    <p className="pipeline-empty">No environments configured for this pipeline.</p>
                )}
            </div>
        </div>
    );
};
