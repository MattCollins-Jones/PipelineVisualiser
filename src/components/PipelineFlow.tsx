import React from 'react';
import type { DeploymentPipeline } from '../types/pipeline';

interface EnvironmentNodeProps {
    envName: string;
    stageName?: string;
    envType?: string | number;
    isDevelopment?: boolean;
}

const EnvironmentNode: React.FC<EnvironmentNodeProps> = ({ envName, stageName, envType, isDevelopment }) => {
    const typeLabel = isDevelopment
        ? 'Development'
        : envType != null
        ? String(envType)
        : 'Target';

    const isDevStyle = isDevelopment || String(envType ?? '').toLowerCase().includes('dev');

    return (
        <div className={`pipeline-node ${isDevStyle ? 'pipeline-node--dev' : 'pipeline-node--target'}`}>
            {stageName && <div className="pipeline-node__stage-label">{stageName}</div>}
            <div className="pipeline-node__env-name">{envName}</div>
            <span className={`pipeline-node__badge ${isDevStyle ? 'badge--dev' : 'badge--target'}`}>
                {typeLabel}
            </span>
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
                            envType={pipeline.developmentEnvironment.environmentType}
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
                            envType={stage.environment?.environmentType}
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
