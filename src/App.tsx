import { useCallback } from "react";
import { PipelineVisualiser } from "./components/PipelineVisualiser";
import { useConnection, useToolboxEvents } from "./hooks/useToolboxAPI";

function App() {
    const { connection, refreshConnection } = useConnection();

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
                <h1>🚀 Pipeline Visualiser</h1>
                <p className="subtitle">Visualise deployment pipelines across environments</p>
            </header>

            <PipelineVisualiser connection={connection} />
        </>
    );
}

export default App;
