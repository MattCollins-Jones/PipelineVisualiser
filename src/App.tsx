import { useCallback, useEffect, useState } from "react";
import { PipelineVisualiser } from "./components/PipelineVisualiser";
import { useConnection, useToolboxEvents } from "./hooks/useToolboxAPI";

function App() {
    const { connection, refreshConnection } = useConnection();
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

    // On first load with no stored preference, default to the PPTB app theme
    useEffect(() => {
        if (!localStorage.getItem('theme') && window.toolboxAPI?.utils?.getCurrentTheme) {
            window.toolboxAPI.utils.getCurrentTheme()
                .then(theme => setDarkMode(theme === 'dark'))
                .catch(() => {});
        }
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const handleEvent = useCallback(
        (event: string) => {
            if (['connection:updated', 'connection:created', 'connection:deleted'].includes(event)) {
                refreshConnection();
            }
        },
        [refreshConnection]
    );

    useToolboxEvents(handleEvent);

    return (
        <>
            <header className="header">
                <div className="header__top">
                    <h1>🚀 Pipeline Visualiser</h1>
                    <button
                        className="btn-theme-toggle"
                        onClick={() => setDarkMode(d => !d)}
                        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {darkMode ? '☀️' : '🌙'}
                    </button>
                </div>
                <p className="subtitle">Visualise deployment pipelines across environments</p>
            </header>

            <PipelineVisualiser connection={connection} />
        </>
    );
}

export default App;
