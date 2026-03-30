export interface DeploymentEnvironment {
    id: string;
    name: string;
    environmentId?: string;
    environmentType?: string | number;
    rawAttributes: Record<string, any>;
}

export interface DeploymentStage {
    id: string;
    name: string;
    pipelineId: string;
    environment: DeploymentEnvironment | null;
    previousStageId: string | null;
    rawAttributes: Record<string, any>;
}

export interface DeploymentPipeline {
    id: string;
    name: string;
    developmentEnvironment: DeploymentEnvironment | null;
    stages: DeploymentStage[];
    rawAttributes: Record<string, any>;
}
