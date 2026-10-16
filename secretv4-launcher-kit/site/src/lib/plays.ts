import { useSyncExternalStore } from 'react';

/**
 * Remembers which games were played, using only this browser's own storage.
 * Nothing is sent anywhere, so there is no tracking and no analytics service.
 */
const KEY = 'secretv4-plays';
/** Opening the same game again within this time does not add another play */
export const PLAY_COOLDOWN_MS = 10 * 60 * 1000;
const MAX_RECENT = 30;

interface PlayData {
  /** game id -> number of counted plays */
  counts: Record<string, number>;
  /** game id -> time of the last counted play */
  last: Record<string, number>;
  /** game ids, most recently opened first */
  recent: number[];
}

function load(): PlayData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<PlayData>;
      return {
        counts: d.counts && typeof d.counts === 'object' ? d.counts : {},
        last: d.last && typeof d.last === 'object' ? d.last : {},
        recent: Array.isArray(d.recent) ? d.recent.filter((x) => typeof x === 'number').slice(0, MAX_RECENT) : [],
      };
    }
  } catch {
    // ignore
  }
  return { counts: {}, last: {}, recent: [] };
}

let current: PlayData = load();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Call when a game is opened (not for Google Drive downloads).
 * The Recent list always updates; the play count only goes up if the cooldown has passed.
 */
export function recordPlay(id: number | undefined) {
  if (typeof id !== 'number') return;
  const now = Date.now();
  const key = String(id);
  const counted = now - (current.last[key] ?? 0) >= PLAY_COOLDOWN_MS;
  current = {
    counts: counted ? { ...current.counts, [key]: (current.counts[key] ?? 0) + 1 } : current.counts,
    last: counted ? { ...current.last, [key]: now } : current.last,
    recent: [id, ...current.recent.filter((x) => x !== id)].slice(0, MAX_RECENT),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

export function usePlays(): PlayData {
  return useSyncExternalStore(subscribe, () => current);
}
