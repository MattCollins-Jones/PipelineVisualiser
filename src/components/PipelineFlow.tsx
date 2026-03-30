import React from 'react';
import type { DeploymentPipeline } from '../types/pipeline';

interface EnvironmentNodeProps {
    envId?: string;
    envName: string;
    stageName?: string;
    isDevelopment?: boolean;
    sharedColor?: string;
}

const EnvironmentNode: React.FC<EnvironmentNodeProps> = ({ envName, stageName, isDevelopment, sharedColor }) => {
    const sharedStyle: React.CSSProperties = sharedColor
        ? { borderColor: sharedColor, boxShadow: `0 0 0 3px ${sharedColor}55` }
        : {};

    return (
        <div
            className={`pipeline-node ${isDevelopment ? 'pipeline-node--dev' : 'pipeline-node--target'}`}
            style={sharedStyle}
        >
            {stageName && <div className="pipeline-node__stage-label">{stageName}</div>}
            <div className="pipeline-node__env-name">{envName}</div>
            <span className={`pipeline-node__badge ${isDevelopment ? 'badge--dev' : 'badge--target'}`}>
                {isDevelopment ? 'Development' : 'Target'}
            </span>
        </div>
    );
};

interface PipelineFlowProps {
    pipeline: DeploymentPipeline;
    sharedColors: Map<string, string>;
}

export const PipelineFlow: React.FC<PipelineFlowProps> = ({ pipeline, sharedColors }) => {
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
