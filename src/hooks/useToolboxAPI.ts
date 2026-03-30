import { useCallback, useEffect, useState } from 'react';

export function useConnection() {
    const [connection, setConnection] = useState<ToolBoxAPI.DataverseConnection | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshConnection = useCallback(async () => {
        try {
            const conn = await window.toolboxAPI.connections.getActiveConnection();
            setConnection(conn);
        } catch (error) {
            console.error('Error refreshing connection:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshConnection();
    }, [refreshConnection]);

    return { connection, isLoading, refreshConnection };
}

export function useToolboxEvents(onEvent: (event: string, data: any) => void) {
    useEffect(() => {
        const handler = (_event: any, payload: ToolBoxAPI.ToolBoxEventPayload) => {
            onEvent(payload.event, payload.data);
        };

        window.toolboxAPI.events.on(handler);
    }, [onEvent]);
}
