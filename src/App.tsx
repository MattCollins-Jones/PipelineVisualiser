import { useCallback, useEffect, useState } from "react";
import { PipelineVisualiser } from "./components/PipelineVisualiser";
import { RunHistoryView } from "./components/RunHistoryView";
import { SettingsPanel } from "./components/SettingsPanel";
import { useConnection, useToolboxEvents } from "./hooks/useToolboxAPI";
import { useSettings } from "./hooks/useSettings";
import { usePipelineData } from "./hooks/usePipelineData";
import type { DeploymentPipeline } from "./types/pipeline";

function App() {
    const { connection, refreshConnection } = useConnection();
    const { settings, updateSettings, isLoaded } = useSettings();
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [view, setView] = useState<'pipelines' | 'history'>('pipelines');
    const [selectedPipeline, setSelectedPipeline] = useState<DeploymentPipeline | null>(null);

    const { pipelines, stageMap, isLoading, error, refresh } = usePipelineData(connection);

    // Resolve the active theme: 'system' reads from PPTB, otherwise use the override
    useEffect(() => {
        if (!isLoaded) return;
        if (settings.themeMode === 'system') {
            if (window.toolboxAPI?.utils?.getCurrentTheme) {
                window.toolboxAPI.utils.getCurrentTheme()
                    .then(t => document.documentElement.classList.toggle('dark', t === 'dark'))
                    .catch(() => document.documentElement.classList.remove('dark'));
            } else {
                document.documentElement.classList.remove('dark');
            }
        } else {
            document.documentElement.classList.toggle('dark', settings.themeMode === 'dark');
        }
    }, [settings.themeMode, isLoaded]);

    const handleEvent = useCallback(
        (event: string) => {
            if (['connection:updated', 'connection:created', 'connection:deleted'].includes(event)) {
                refreshConnection();
            }
        },
        [refreshConnection]
    );

    useToolboxEvents(handleEvent);

    const handleViewHistory = useCallback((pipeline: DeploymentPipeline) => {
        setSelectedPipeline(pipeline);
        setView('history');
    }, []);

    const handleBackToPipelines = useCallback(() => {
        setView('pipelines');
        setSelectedPipeline(null);
    }, []);

    return (
        <>
            <header className="header">
                <div className="header__top">
                    <h1>🚀 Pipeline Visualiser</h1>
                    <button
                        className="btn-settings"
                        onClick={() => setSettingsOpen(o => !o)}
                        title="Settings"
                        aria-label="Open settings"
                        aria-expanded={settingsOpen}
                    >
                        ⚙️
                    </button>
                </div>
                <p className="subtitle">Visualise deployment pipelines across environments</p>
            </header>

            {settingsOpen && (
                <SettingsPanel
                    settings={settings}
                    onUpdate={updateSettings}
                    onClose={() => setSettingsOpen(false)}
                />
            )}

            {view === 'history' && selectedPipeline ? (
                <RunHistoryView
                    pipeline={selectedPipeline}
                    stageMap={stageMap}
                    connection={connection}
                    onBack={handleBackToPipelines}
                />
            ) : (
                <PipelineVisualiser
                    connection={connection}
                    pipelines={pipelines}
                    isLoading={isLoading}
                    error={error}
                    refresh={refresh}
                    settings={settings}
                    onViewHistory={handleViewHistory}
                />
            )}
        </>
    );
}

export default App;
