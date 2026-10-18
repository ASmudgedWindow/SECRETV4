import { useSyncExternalStore } from 'react';

/**
 * Personal progress kept in this browser only: time spent in games, days played, and which
 * achievements are unlocked. Included in the Settings > Save backup file.
 */
interface ProgressData {
  since: number;
  /** game id -> seconds spent in the in-site player */
  seconds: Record<string, number>;
  /** days (YYYY-MM-DD) on which a game was opened */
  days: string[];
  /** achievement id -> time unlocked */
  unlocked: Record<string, number>;
}

const KEY = 'secretv4-progress';

function load(): ProgressData {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<ProgressData> | null;
    if (raw && typeof raw === 'object') {
      return {
        since: typeof raw.since === 'number' ? raw.since : Date.now(),
        seconds: raw.seconds && typeof raw.seconds === 'object' ? raw.seconds : {},
        days: Array.isArray(raw.days) ? raw.days.filter((d) => typeof d === 'string').slice(-400) : [],
        unlocked: raw.unlocked && typeof raw.unlocked === 'object' ? raw.unlocked : {},
      };
    }
  } catch {
    // ignore
  }
  return { since: Date.now(), seconds: {}, days: [], unlocked: {} };
}

let current: ProgressData = load();
const listeners = new Set<() => void>();

function commit(next: ProgressData) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useProgress(): ProgressData {
  return useSyncExternalStore(subscribe, () => current);
}

export function totalSeconds(p: ProgressData): number {
  return Object.values(p.seconds).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
}

export function addPlaySeconds(id: number, secs: number) {
  const key = String(id);
  commit({ ...current, seconds: { ...current.seconds, [key]: (current.seconds[key] ?? 0) + secs } });
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Called whenever a game is opened */
export function markPlayedToday() {
  const t = today();
  if (current.days.includes(t)) return;
  commit({ ...current, days: [...current.days, t].slice(-400) });
}

// ---- achievement pop-up ----
interface Toast {
  id: number;
  text: string;
}
let toast: Toast | null = null;
let toastId = 0;
const toastListeners = new Set<() => void>();

function setToast(t: Toast | null) {
  toast = t;
  toastListeners.forEach((l) => l());
}

export function useToast(): Toast | null {
  return useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb);
      return () => toastListeners.delete(cb);
    },
    () => toast,
  );
}

export function dismissToast(id: number) {
  if (toast && toast.id === id) setToast(null);
}

/** Saves newly earned achievements and shows one pop-up for them */
export function unlockAchievements(ids: string[], message: string) {
  const now = Date.now();
  const unlocked = { ...current.unlocked };
  for (const id of ids) if (!unlocked[id]) unlocked[id] = now;
  commit({ ...current, unlocked });
  setToast({ id: ++toastId, text: message });
}
