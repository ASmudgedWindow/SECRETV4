import { useSyncExternalStore } from 'react';

/**
 * Player-made lists of games ("Actually Good Games", "Play With Friends"...).
 * Saved in this browser only, so they are included in the Settings > Save backup file.
 */
export interface Collection {
  id: string;
  name: string;
  games: number[];
  created: number;
}

const KEY = 'secretv4-collections';
export const MAX_COLLECTIONS = 30;
export const MAX_GAMES_PER_COLLECTION = 500;
export const MAX_NAME = 40;

function load(): Collection[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    const out: Collection[] = [];
    for (const c of raw as Partial<Collection>[]) {
      if (c && typeof c.id === 'string' && typeof c.name === 'string' && Array.isArray(c.games)) {
        out.push({
          id: c.id,
          name: c.name.slice(0, MAX_NAME),
          games: c.games.filter((g) => typeof g === 'number').slice(0, MAX_GAMES_PER_COLLECTION),
          created: typeof c.created === 'number' ? c.created : 0,
        });
      }
    }
    return out.slice(0, MAX_COLLECTIONS);
  } catch {
    return [];
  }
}

let current: Collection[] = load();
const listeners = new Set<() => void>();

function commit(next: Collection[]) {
  current = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  listeners.forEach((l) => l());
}

const cleanName = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

/** Returns the new collection's id, or null if the name is empty or the limit is reached */
export function createCollection(name: string, firstGame?: number): string | null {
  const n = cleanName(name);
  if (!n || current.length >= MAX_COLLECTIONS) return null;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  commit([...current, { id, name: n, games: firstGame !== undefined ? [firstGame] : [], created: Date.now() }]);
  return id;
}

export function renameCollection(id: string, name: string) {
  const n = cleanName(name);
  if (!n) return;
  commit(current.map((c) => (c.id === id ? { ...c, name: n } : c)));
}

export function deleteCollection(id: string) {
  commit(current.filter((c) => c.id !== id));
}

/** Adds the game if it is not in the collection, removes it if it is. Returns false if the collection is full. */
export function toggleInCollection(id: string, gameId: number): boolean {
  const c = current.find((x) => x.id === id);
  if (!c) return false;
  if (c.games.includes(gameId)) {
    commit(current.map((x) => (x.id === id ? { ...x, games: x.games.filter((g) => g !== gameId) } : x)));
    return true;
  }
  if (c.games.length >= MAX_GAMES_PER_COLLECTION) return false;
  commit(current.map((x) => (x.id === id ? { ...x, games: [...x.games, gameId] } : x)));
  return true;
}

export function useCollections(): Collection[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}
