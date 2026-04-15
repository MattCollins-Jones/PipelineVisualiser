import React from 'react';
import { AppSettings } from '../types/settings';

interface SettingsPanelProps {
    settings: AppSettings;
    onUpdate: (patch: Partial<AppSettings>) => void;
    onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onUpdate, onClose }) => (
    <>
        <div className="settings-overlay" onClick={onClose} aria-hidden="true" />
        <div className="settings-panel" role="dialog" aria-label="Settings" aria-modal="true">
            <div className="settings-panel__header">
                <h2>⚙️ Settings</h2>
                <button className="settings-panel__close" onClick={onClose} aria-label="Close settings">✕</button>
            </div>

            <div className="settings-panel__body">

                {/* ── Theme ────────────────────────────────────────────────── */}
                <section className="settings-section">
                    <h3 className="settings-section__title">Theme</h3>
                    <div className="settings-radio-group">
                        {(['system', 'light', 'dark'] as const).map(mode => (
                            <label key={mode} className="settings-radio">
                                <input
                                    type="radio"
                                    name="themeMode"
                                    value={mode}
                                    checked={settings.themeMode === mode}
                                    onChange={() => onUpdate({ themeMode: mode })}
                                />
                                <span className="settings-radio__label">
                                    {mode === 'system' && '🖥️ Follow toolbox theme'}
                                    {mode === 'light'  && '☀️ Light'}
                                    {mode === 'dark'   && '🌙 Dark'}
                                </span>
                            </label>
                        ))}
                    </div>
                </section>

                {/* ── Display ──────────────────────────────────────────────── */}
                <section className="settings-section">
                    <h3 className="settings-section__title">Display</h3>
                    <div className="settings-toggle-group">
                        <ToggleRow
                            label="Show legend"
                            description="Dot colour key and shared environment notes"
                            checked={settings.showLegend}
                            onChange={v => onUpdate({ showLegend: v })}
                        />
                        <ToggleRow
                            label="Show deployment history"
                            description="Last 5 deployment status dots per stage"
                            checked={settings.showDeploymentDots}
                            onChange={v => onUpdate({ showDeploymentDots: v })}
                        />
                        <ToggleRow
                            label="Show last deployed solution"
                            description="Artifact name, status and date of the most recent run"
                            checked={settings.showLastDeployment}
                            onChange={v => onUpdate({ showLastDeployment: v })}
                        />
                    </div>
                </section>

            </div>
        </div>
    </>
);

interface ToggleRowProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onChange }) => (
    <label className="settings-toggle">
        <div className="settings-toggle__text">
            <span className="settings-toggle__label">{label}</span>
            <span className="settings-toggle__desc">{description}</span>
        </div>
        <span className={`settings-toggle__switch${checked ? ' settings-toggle__switch--on' : ''}`}>
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="settings-toggle__input"
            />
            <span className="settings-toggle__thumb" />
        </span>
    </label>
);
