import { useCallback, useEffect, useState } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from '../types/settings';

const SETTINGS_KEY = 'pipelineVisualiserSettings';

async function loadFromPPTB(): Promise<Partial<AppSettings>> {
    try {
        const raw = await window.toolboxAPI?.settings?.get(SETTINGS_KEY);
        if (raw && typeof raw === 'object') return raw as Partial<AppSettings>;
    } catch { /* fall through */ }
    return {};
}

async function saveToPPTB(settings: AppSettings): Promise<void> {
    try {
        await window.toolboxAPI?.settings?.set(SETTINGS_KEY, settings);
    } catch { /* fall through */ }
}

export function useSettings() {
    const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        loadFromPPTB().then(stored => {
            setSettingsState(prev => ({ ...prev, ...stored }));
            setIsLoaded(true);
        });
    }, []);

    const updateSettings = useCallback((patch: Partial<AppSettings>) => {
        setSettingsState(prev => {
            const next = { ...prev, ...patch };
            saveToPPTB(next);
            return next;
        });
    }, []);

    return { settings, updateSettings, isLoaded };
}
