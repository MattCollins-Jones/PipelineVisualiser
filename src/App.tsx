import { useCallback } from "react";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { PipelineVisualiser } from "./components/PipelineVisualiser";
import { useConnection, useToolboxEvents } from "./hooks/useToolboxAPI";

function App() {
    const { connection, isLoading, refreshConnection } = useConnection();

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

            <ConnectionStatus connection={connection} isLoading={isLoading} />

            <PipelineVisualiser connection={connection} />
        </>
    );
}

export default App;
