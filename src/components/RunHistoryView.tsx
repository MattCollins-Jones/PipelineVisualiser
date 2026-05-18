import React, { useMemo, useState } from 'react';
import type { DeploymentPipeline, DeploymentStageRun } from '../types/pipeline';
import type { DeploymentStage } from '../types/pipeline';
import { useRunHistory } from '../hooks/useRunHistory';

// ─── Status helpers (duplicated from PipelineFlow to keep component self-contained) ──

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
        default: return status !== null ? `Status ${status}` : '—';
    }
}

function getStatusClass(status: number | null): string {
    if (status === 200000002) return 'run-status--succeeded';
    if (status === 200000003) return 'run-status--failed';
    if (status === 200000004) return 'run-status--cancelled';
    if (status === 200000001 || status === 200000010) return 'run-status--in-progress';
    return 'run-status--other';
}

function formatDateTime(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatDuration(start: string | null, end: string | null): string {
    if (!start || !end) return '—';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (isNaN(ms) || ms < 0) return '—';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
}

function buildDataverseUrl(connection: ToolBoxAPI.DataverseConnection | null, recordId: string): string | null {
    const envUrl = (connection as any)?.environmentUrl
        ?? (connection as any)?.url
        ?? (connection as any)?.apiUrl?.replace('/api/data/v9.2', '');
    if (!envUrl) return null;
    const base = envUrl.replace(/\/+$/, '');
    return `${base}/main.aspx?etn=deploymentstagerun&id=${recordId}&pagetype=entityrecord`;
}

// ─── Sort types ───────────────────────────────────────────────────────────────

type SortKey = 'stageName' | 'targetEnvironmentName' | 'artifactName' | 'solutionVersion' | 'owner' | 'status' | 'startTime' | 'endTime';
type SortDir = 'asc' | 'desc';

function sortRuns(runs: DeploymentStageRun[], key: SortKey, dir: SortDir): DeploymentStageRun[] {
    return [...runs].sort((a, b) => {
        let av: string | number | null = null;
        let bv: string | number | null = null;

        if (key === 'status') { av = a.status; bv = b.status; }
        else if (key === 'startTime') { av = a.startTime; bv = b.startTime; }
        else if (key === 'endTime') { av = a.endTime; bv = b.endTime; }
        else { av = a[key]; bv = b[key]; }

        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;

        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return dir === 'asc' ? cmp : -cmp;
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RunHistoryViewProps {
    pipeline: DeploymentPipeline;
    stageMap: Map<string, DeploymentStage>;
    connection: ToolBoxAPI.DataverseConnection | null;
    onBack: () => void;
}

export const RunHistoryView: React.FC<RunHistoryViewProps> = ({ pipeline, stageMap, connection, onBack }) => {
    const { runs, isLoading, error, refresh } = useRunHistory(pipeline.id, stageMap);

    // Log raw field names on first load so we can diagnose blank fields
    React.useEffect(() => {
        if (runs.length > 0) {
            const keys = Object.keys(runs[0].rawAttributes);
            console.debug('[RunHistoryView] rawAttributes keys:', keys);
            console.debug('[RunHistoryView] sample record:', runs[0].rawAttributes);
        }
    }, [runs]);

    // Filter state
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterEnv, setFilterEnv] = useState<string>('');
    const [filterDateFrom, setFilterDateFrom] = useState<string>('');
    const [filterDateTo, setFilterDateTo] = useState<string>('');

    // Sort state — default: startTime descending (newest first)
    const [sortKey, setSortKey] = useState<SortKey>('startTime');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    // Unique environment options for filter dropdown
    const envOptions = useMemo(() => {
        const set = new Set<string>();
        for (const r of runs) {
            if (r.targetEnvironmentName) set.add(r.targetEnvironmentName);
        }
        return [...set].sort();
    }, [runs]);

    // Unique status options for filter dropdown
    const statusOptions = useMemo(() => {
        const set = new Set<number>();
        for (const r of runs) {
            if (r.status !== null) set.add(r.status);
        }
        return [...set].sort((a, b) => a - b);
    }, [runs]);

    const filteredRuns = useMemo(() => {
        let result = runs;
        if (filterStatus) result = result.filter(r => String(r.status) === filterStatus);
        if (filterEnv) result = result.filter(r => r.targetEnvironmentName === filterEnv);
        if (filterDateFrom) result = result.filter(r => r.startTime && r.startTime >= filterDateFrom);
        if (filterDateTo) {
            // Include the full to-day by comparing with end-of-day
            const endOfDay = filterDateTo + 'T23:59:59';
            result = result.filter(r => r.startTime && r.startTime <= endOfDay);
        }
        return sortRuns(result, sortKey, sortDir);
    }, [runs, filterStatus, filterEnv, filterDateFrom, filterDateTo, sortKey, sortDir]);

    const SortIcon = ({ col }: { col: SortKey }) => {
        if (sortKey !== col) return <span className="sort-icon sort-icon--inactive">↕</span>;
        return <span className="sort-icon">{sortDir === 'asc' ? '↑' : '↓'}</span>;
    };

    const clearFilters = () => {
        setFilterStatus('');
        setFilterEnv('');
        setFilterDateFrom('');
        setFilterDateTo('');
    };

    const hasFilters = filterStatus || filterEnv || filterDateFrom || filterDateTo;

    return (
        <div className="card run-history">
            {/* Header */}
            <div className="run-history__header">
                <div className="run-history__title-row">
                    <button className="btn btn-secondary btn-back" onClick={onBack}>
                        ← Back
                    </button>
                    <div>
                        <h2>📋 Run History</h2>
                        <p className="run-history__pipeline-name">{pipeline.name}</p>
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={refresh}
                    disabled={isLoading}
                >
                    {isLoading ? 'Loading…' : '↻ Refresh'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="info-box error">
                    <p><strong>Error:</strong> {error}</p>
                </div>
            )}

            {/* Filter bar */}
            {!isLoading && runs.length > 0 && (
                <div className="run-history__filters">
                    <select
                        className="run-history__filter-select"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        aria-label="Filter by status"
                    >
                        <option value="">All statuses</option>
                        {statusOptions.map(s => (
                            <option key={s} value={String(s)}>{getRunStatusLabel(s)}</option>
                        ))}
                    </select>

                    <select
                        className="run-history__filter-select"
                        value={filterEnv}
                        onChange={e => setFilterEnv(e.target.value)}
                        aria-label="Filter by environment"
                    >
                        <option value="">All environments</option>
                        {envOptions.map(e => (
                            <option key={e} value={e}>{e}</option>
                        ))}
                    </select>

                    <div className="run-history__date-range">
                        <label className="run-history__date-label">From</label>
                        <input
                            type="date"
                            className="run-history__filter-date"
                            value={filterDateFrom}
                            onChange={e => setFilterDateFrom(e.target.value)}
                            aria-label="From date"
                        />
                        <label className="run-history__date-label">To</label>
                        <input
                            type="date"
                            className="run-history__filter-date"
                            value={filterDateTo}
                            onChange={e => setFilterDateTo(e.target.value)}
                            aria-label="To date"
                        />
                    </div>

                    {hasFilters && (
                        <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                            ✕ Clear filters
                        </button>
                    )}

                    <span className="run-history__count">
                        {filteredRuns.length} of {runs.length} runs
                    </span>
                </div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className="info-box">
                    <div className="loading">Loading run history…</div>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && runs.length === 0 && (
                <div className="info-box">
                    <p>No deployment runs found for this pipeline.</p>
                </div>
            )}

            {/* No results after filtering */}
            {!isLoading && !error && runs.length > 0 && filteredRuns.length === 0 && (
                <div className="info-box">
                    <p>No runs match the current filters. <button className="link-btn" onClick={clearFilters}>Clear filters</button></p>
                </div>
            )}

            {/* Table */}
            {!isLoading && filteredRuns.length > 0 && (
                <div className="run-history__table-wrapper">
                    <table className="run-history__table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('stageName')} className="sortable">
                                    Stage <SortIcon col="stageName" />
                                </th>
                                <th onClick={() => handleSort('targetEnvironmentName')} className="sortable">
                                    Target Env <SortIcon col="targetEnvironmentName" />
                                </th>
                                <th onClick={() => handleSort('artifactName')} className="sortable">
                                    Artifact <SortIcon col="artifactName" />
                                </th>
                                <th onClick={() => handleSort('solutionVersion')} className="sortable">
                                    Version <SortIcon col="solutionVersion" />
                                </th>
                                <th onClick={() => handleSort('owner')} className="sortable">
                                    Owner <SortIcon col="owner" />
                                </th>
                                <th onClick={() => handleSort('status')} className="sortable">
                                    Status <SortIcon col="status" />
                                </th>
                                <th onClick={() => handleSort('startTime')} className="sortable">
                                    Started <SortIcon col="startTime" />
                                </th>
                                <th onClick={() => handleSort('endTime')} className="sortable">
                                    Finished <SortIcon col="endTime" />
                                </th>
                                <th>Duration</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRuns.map(run => {
                                const dvUrl = buildDataverseUrl(connection, run.id);
                                return (
                                    <tr key={run.id}>
                                        <td>{run.stageName ?? '—'}</td>
                                        <td>{run.targetEnvironmentName ?? '—'}</td>
                                        <td className="run-history__artifact">{run.artifactName ?? '—'}</td>
                                        <td>{run.solutionVersion ?? '—'}</td>
                                        <td>{run.owner ?? '—'}</td>
                                        <td>
                                            <span className={`run-status ${getStatusClass(run.status)}`}>
                                                {getRunStatusLabel(run.status)}
                                            </span>
                                        </td>
                                        <td className="run-history__datetime">{formatDateTime(run.startTime)}</td>
                                        <td className="run-history__datetime">{formatDateTime(run.endTime)}</td>
                                        <td>{formatDuration(run.startTime, run.endTime)}</td>
                                        <td>
                                            {dvUrl ? (
                                                <button
                                                    className="btn btn-open-dv"
                                                    onClick={() => window.open(dvUrl, '_blank', 'noopener,noreferrer')}
                                                    title="Open record in Dataverse"
                                                >
                                                    🔗 Open
                                                </button>
                                            ) : (
                                                <span className="run-history__no-url">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
