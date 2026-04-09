import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { DeploymentPipeline, DeploymentStageRun } from '../types/pipeline';

interface TooltipState {
    text: string;
    x: number;
    y: number;
}

/** Compute tooltip position centred above the anchor, clamped to the viewport.
 *  tipWidth must match the CSS max-width on .pipeline-tooltip (320px).
 *  leftPad accounts for the ToolBox sidebar, which is a parent-window overlay
 *  invisible to getBoundingClientRect inside the iframe (~50px; 75px is safe). */
function computeTooltipPos(anchor: DOMRect): { x: number; y: number } {
    const tipW    = 320;
    const tipH    = 38;  // approximate single-line height
    const pad     = 8;
    const leftPad = 75;

    let x = anchor.left + anchor.width / 2 - tipW / 2;
    let y = anchor.top - tipH - 8;

    if (x + tipW > window.innerWidth - pad) x = window.innerWidth - pad - tipW;
    if (x < leftPad)                        x = leftPad;
    if (y < pad)                            y = anchor.bottom + 8;
    if (y + tipH > window.innerHeight - pad) y = window.innerHeight - pad - tipH;

    return { x, y };
}

// ─── Deployment run status helpers ───────────────────────────────────────────

/** Colour used for the dot indicators (decorative — not text). */
function getRunStatusColor(status: number | null): string {
    if (status === 200000002) return '#22c55e'; // Succeeded
    if (status === 200000003) return '#ef4444'; // Failed
    if (status === 200000004) return '#eab308'; // Canceled
    return '#d1d5db'; // All other statuses
}

/** Colour used for the status label text — must meet WCAG AA contrast on white. */
function getRunStatusTextColor(status: number | null): string {
    if (status === 200000002) return '#16a34a'; // Succeeded — darker green (~5.1:1)
    if (status === 200000003) return '#dc2626'; // Failed — darker red (~4.7:1)
    if (status === 200000004) return '#b45309'; // Canceled — darker amber (~5.0:1)
    return '#6b7280'; // All other statuses (~4.6:1)
}

function getRunStatusLabel(status: number | null): string {
    switch (status) {
        case 200000000: return 'Not Started';
        case 200000001: return 'Started';
        case 200000002: return 'Succeeded';
        case 200000003: return 'Failed';
        case 200000004: return 'Cancelled';
        case 200000005: return 'Scheduled';
        case 200000006: return 'Validating';
        case 200000007: return 'Validation Succeeded';
        case 200000008: return 'Pre-Deploy In Progress';
        case 200000009: return 'Pre-Deploy Succeeded';
        case 200000010: return 'Deploying';
        default: return 'Unknown';
    }
}

function formatRunDate(isoString: string | null): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Deployment history strip ─────────────────────────────────────────────────

interface DeploymentHistoryProps {
    runs: DeploymentStageRun[];
}

const DeploymentHistory: React.FC<DeploymentHistoryProps> = ({ runs }) => {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);

    const handleDotEnter = useCallback((run: DeploymentStageRun, e: React.MouseEvent) => {
        const parts = [getRunStatusLabel(run.status)];
        if (run.artifactName) parts.push(run.artifactName);
        const date = formatRunDate(run.endTime ?? run.startTime);
        if (date) parts.push(date);
        const { x, y } = computeTooltipPos((e.currentTarget as Element).getBoundingClientRect());
        setTooltip({ text: parts.join(' · '), x, y });
    }, []);

    const handleDotLeave = useCallback(() => setTooltip(null), []);

    if (runs.length === 0) return null;

    const lastRun = runs[0];
    const statusTextColor = getRunStatusTextColor(lastRun.status);
    const dateStr = formatRunDate(lastRun.endTime ?? lastRun.startTime);

    return (
        <>
            <div className="deployment-history">
                <div className="deployment-dots">
                    {runs.map(run => (
                        <span
                            key={run.id}
                            className="deployment-dot"
                            style={{ background: getRunStatusColor(run.status) }}
                            onMouseEnter={e => handleDotEnter(run, e)}
                            onMouseLeave={handleDotLeave}
                        />
                    ))}
                </div>
                <span className="deployment-history__divider" aria-hidden="true" />
                <div className="deployment-summary">
                    {lastRun.artifactName && (
                        <span className="deployment-summary__artifact">
                            {lastRun.artifactName}
                            {lastRun.solutionVersion && ` v${lastRun.solutionVersion}`}
                        </span>
                    )}
                    <span className="deployment-summary__status" style={{ color: statusTextColor }}>
                        {getRunStatusLabel(lastRun.status)}
                    </span>
                    {dateStr && <span className="deployment-summary__date">{dateStr}</span>}
                </div>
            </div>

            {tooltip && createPortal(
                <div className="pipeline-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
                    {tooltip.text}
                </div>,
                document.body
            )}
        </>
    );
};

// ─── Environment node ─────────────────────────────────────────────────────────

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
        const { x, y } = computeTooltipPos((e.currentTarget as Element).getBoundingClientRect());
        setTooltip({ text: tooltipText, x, y });
    }, [tooltipText]);

    const handleMouseLeave = useCallback(() => setTooltip(null), []);

    const sharedStyle: React.CSSProperties = sharedColor
        ? { borderColor: sharedColor, boxShadow: `0 0 0 3px ${sharedColor}55` }
        : {};

    return (
        <>
            <div
                className={`pipeline-node ${isDevelopment ? 'pipeline-node--dev' : 'pipeline-node--target'}`}
                style={sharedStyle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {stageName && <div className="pipeline-node__stage-label">{stageName}</div>}
                <div className="pipeline-node__env-name">{envName}</div>
                <span className={`pipeline-node__badge ${isDevelopment ? 'badge--dev' : 'badge--target'}`}>
                    {isDevelopment ? 'Development' : 'Target'}
                </span>
            </div>

            {tooltip && createPortal(
                <div className="pipeline-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
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
            <DeploymentHistory runs={pipeline.recentRuns} />
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
