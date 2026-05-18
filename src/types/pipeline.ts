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
    /** Delegated deployment type for this stage */
    delegationType: 'none' | 'user' | 'spn';
    rawAttributes: Record<string, any>;
}

export interface DeploymentStageRun {
    id: string;
    stageId: string | null;
    stageName: string | null;
    pipelineId: string | null;
    targetEnvironmentId: string | null;
    targetEnvironmentName: string | null;
    owner: string | null;
    /** stagerunstatus option set value */
    status: number | null;
    artifactName: string | null;
    solutionVersion: string | null;
    startTime: string | null;
    endTime: string | null;
    rawAttributes: Record<string, any>;
}

export interface DeploymentPipeline {
    id: string;
    name: string;
    developmentEnvironment: DeploymentEnvironment | null;
    stages: DeploymentStage[];
    /** Last 5 stage runs for this pipeline, newest first */
    recentRuns: DeploymentStageRun[];
    rawAttributes: Record<string, any>;
}
