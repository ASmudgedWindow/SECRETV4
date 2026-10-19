import { setFlag } from '@/lib/progress';
import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { themes, defaultTheme, type Theme } from '@/data/themes';
import { isBackgroundId } from '@/data/backgrounds';
import type { BackgroundId } from '@/lib/backgroundScenes';

export interface Settings {
  themeId: string;
  aboutBlankCloaking: boolean;
  closeWarning: boolean;
  lookalikeText: boolean;
  /** When on, games open as Google Drive links instead of playing on this site */
  driveLinksOnly: boolean;
  /** Lets the site owner see this browser is online and send it surprises. On by default. */
  remoteOk: boolean;
  background: BackgroundId;
  /** How solid cards and panels are (lower = more of the background shows through) */
  panelOpacity: number;
}

const STORAGE_KEY = 'secretv4-settings';

const defaultSettings: Settings = {
  themeId: 'cyber',
  aboutBlankCloaking: true,
  closeWarning: true,
  lookalikeText: true,
  driveLinksOnly: false,
  remoteOk: true,
  background: 'stars',
  panelOpacity: 0.45,
};

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = { ...defaultSettings, ...JSON.parse(raw) } as Settings;
      if (!isBackgroundId(saved.background)) saved.background = defaultSettings.background;
      if (typeof saved.panelOpacity !== 'number' || Number.isNaN(saved.panelOpacity)) saved.panelOpacity = defaultSettings.panelOpacity;
      saved.panelOpacity = Math.min(1, Math.max(0.2, saved.panelOpacity));
      return saved;
    }
  } catch {
    // ignore
  }
  return defaultSettings;
}

// One shared copy of the settings so every part of the app sees changes right away
let current: Settings = loadSettings();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current settings, for code that runs inside click handlers */
export function getSettingsSnapshot(): Settings {
  return current;
}

function updateSettings(patch: Partial<Settings>) {
  // Things the achievements care about
  if (patch.themeId !== undefined && patch.themeId !== current.themeId) setFlag('themeChanged');
  if (patch.background !== undefined && patch.background !== current.background) {
    setFlag('backgroundChanged');
    if (patch.background === 'none') setFlag('backgroundOff');
  }
  current = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

/** Watch a single setting from anywhere */
export function useSetting<K extends keyof Settings>(key: K): Settings[K] {
  return useSyncExternalStore(subscribe, () => current[key]);
}

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, () => current);
  const update = useCallback(updateSettings, []);

  const theme: Theme = themes.find((t) => t.id === settings.themeId) ?? defaultTheme;

  useEffect(() => {
    const c = theme.colors;
    const root = document.documentElement;
    root.style.setProperty('--bg', c.bg);
    // Cards and panels let the animated background show through (solid when there is no background)
    const a = settings.background === 'none' ? 1 : settings.panelOpacity;
    root.style.setProperty('--bg-secondary', withAlpha(c.bgSecondary, a));
    root.style.setProperty('--bg-tertiary', withAlpha(c.bgTertiary, a));
    root.style.setProperty('--panel', withAlpha(c.panel, Math.max(a, 0.92)));
    root.style.setProperty('--border', c.border);
    root.style.setProperty('--text', c.text);
    root.style.setProperty('--text-dim', c.textDim);
    root.style.setProperty('--accent', c.accent);
    root.style.setProperty('--accent-glow', c.accentGlow);
    root.style.setProperty('--accent-secondary', c.accentSecondary);
  }, [theme, settings.background, settings.panelOpacity]);

  return { settings, update, theme };
}
