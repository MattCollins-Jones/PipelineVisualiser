import { useCallback, useEffect, useState } from "react";
import { PipelineVisualiser } from "./components/PipelineVisualiser";
import { useConnection, useToolboxEvents } from "./hooks/useToolboxAPI";

function App() {
    const { connection, refreshConnection } = useConnection();
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme-user-override') === 'dark');

    // On startup: if no explicit user override, always follow the PPTB app theme
    useEffect(() => {
        if (!localStorage.getItem('theme-user-override') && window.toolboxAPI?.utils?.getCurrentTheme) {
            window.toolboxAPI.utils.getCurrentTheme()
                .then(theme => setDarkMode(theme === 'dark'))
                .catch(() => {});
        }
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
    }, [darkMode]);

    const handleToggle = () => {
        setDarkMode(d => {
            const next = !d;
            localStorage.setItem('theme-user-override', next ? 'dark' : 'light');
            return next;
        });
    };

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
                        onClick={handleToggle}
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
