export interface AppSettings {
    /** 'system' = always follow PPTB app theme; 'light' / 'dark' = user override */
    themeMode: 'system' | 'light' | 'dark';
    /** Show the legend & notes section in the visualiser */
    showLegend: boolean;
    /** Show the last 5 deployment history dots per pipeline stage */
    showDeploymentDots: boolean;
    /** Show the last deployed solution summary (artifact name, status, date) */
    showLastDeployment: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
    themeMode: 'system',
    showLegend: true,
    showDeploymentDots: true,
    showLastDeployment: true,
};
