import React from 'react';
import type { DeploymentPipeline } from '../types/pipeline';

interface EnvironmentNodeProps {
    envName: string;
    stageName?: string;
    isDevelopment?: boolean;
}

const EnvironmentNode: React.FC<EnvironmentNodeProps> = ({ envName, stageName, isDevelopment }) => {
    return (
        <div className={`pipeline-node ${isDevelopment ? 'pipeline-node--dev' : 'pipeline-node--target'}`}>
            {stageName && <div className="pipeline-node__stage-label">{stageName}</div>}
            <div className="pipeline-node__env-name">{envName}</div>
            {isDevelopment && (
                <span className="pipeline-node__badge badge--dev">Development</span>
            )}
        </div>
    );
};

interface PipelineFlowProps {
    pipeline: DeploymentPipeline;
}

export const PipelineFlow: React.FC<PipelineFlowProps> = ({ pipeline }) => {
    const hasNodes = pipeline.developmentEnvironment || pipeline.stages.length > 0;

    return (
        <div className="pipeline-card">
            <h3 className="pipeline-card__name">{pipeline.name}</h3>
            <div className="pipeline-flow">
                {pipeline.developmentEnvironment && (
                    <>
                        <EnvironmentNode
                            envName={pipeline.developmentEnvironment.name}
                            isDevelopment
                        />
                        {pipeline.stages.length > 0 && (
                            <div className="pipeline-arrow" aria-hidden="true">→</div>
                        )}
                    </>
                )}

                {pipeline.stages.map((stage, index) => (
                    <React.Fragment key={stage.id}>
                        <EnvironmentNode
                            envName={stage.environment?.name ?? 'Unknown Environment'}
                            stageName={stage.name}
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
