import { useEffect, useMemo, useState } from 'react';
import { libraryGames, type LibraryGame } from '@/data/gameLibrary';
import { rageBaitGames } from '@/data/categories';
import { usePlays } from '@/lib/plays';
import { useCollections, type Collection } from '@/lib/collections';
import { totalSeconds, useProgress } from '@/lib/progress';

const gameById = new Map(libraryGames.map((g) => [g.id, g]));
const rageIds = new Set(rageBaitGames.map((g) => g.id));

/** Consoles that do not count as "retro" for the Retro Fan achievement */
const NOT_RETRO = new Set(['DS', 'Bootleg']);

export type PlayCategory = 'Library' | 'Ragebait' | 'Flash' | 'Emulated';

/** Every game belongs to exactly one of these, which is what Explorer counts */
export function playCategory(g: LibraryGame): PlayCategory {
  if (g.kind === 'flash') return 'Flash';
  if (g.kind === 'emulated') return 'Emulated';
  if (rageIds.has(g.id)) return 'Ragebait';
  return 'Library';
}

export interface Inputs {
  /** ids of games that have been played at least once */
  playedIds: number[];
  favorites: number;
  collections: Collection[];
  seconds: number;
  days: number;
}

export interface Context {
  distinctGames: number;
  categories: PlayCategory[];
  retro: boolean;
  favorites: number;
  biggestCollection: number;
  seconds: number;
  days: number;
}

export function buildContext(i: Inputs, lookup: (id: number) => LibraryGame | undefined = (id) => gameById.get(id)): Context {
  const cats = new Set<PlayCategory>();
  let retro = false;
  for (const id of i.playedIds) {
    const g = lookup(id);
    if (!g) continue;
    cats.add(playCategory(g));
    if (g.kind === 'emulated' && !NOT_RETRO.has(g.system ?? '')) retro = true;
  }
  return {
    distinctGames: i.playedIds.length,
    categories: [...cats],
    retro,
    favorites: i.favorites,
    biggestCollection: i.collections.reduce((m, c) => Math.max(m, c.games.length), 0),
    seconds: i.seconds,
    days: i.days,
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  target: number;
  value: (c: Context) => number;
  /** How to show progress, if not a plain number */
  display?: (n: number) => string;
}

const minutes = (n: number) => `${Math.floor(n / 60)} min`;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-game', name: 'First Game', description: 'Open your first game.', target: 1, value: (c) => c.distinctGames },
  { id: 'warming-up', name: 'Warming Up', description: 'Play 10 different games.', target: 10, value: (c) => c.distinctGames },
  { id: 'veteran', name: 'Veteran', description: 'Play 100 different games.', target: 100, value: (c) => c.distinctGames },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Play games from 4 different categories: Library, Ragebait, Flash and Emulated.',
    target: 4,
    value: (c) => c.categories.length,
  },
  { id: 'retro-fan', name: 'Retro Fan', description: 'Play a game from a retro console.', target: 1, value: (c) => (c.retro ? 1 : 0) },
  { id: 'collector', name: 'Collector', description: 'Favorite 25 games.', target: 25, value: (c) => c.favorites },
  { id: 'curator', name: 'Curator', description: 'Put 5 games in one collection.', target: 5, value: (c) => c.biggestCollection },
  {
    id: 'hour-one',
    name: 'Hour One',
    description: 'Spend 1 hour in games on SecretV4.',
    target: 3600,
    value: (c) => c.seconds,
    display: minutes,
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Spend 10 hours in games on SecretV4.',
    target: 36000,
    value: (c) => c.seconds,
    display: minutes,
  },
  { id: 'regular', name: 'Regular', description: 'Play on 7 different days.', target: 7, value: (c) => c.days },
];

/** Number of favorited games, kept up to date as stars are toggled */
export function useFavoriteCount(): number {
  const read = () => {
    try {
      const raw = JSON.parse(localStorage.getItem('secretv4-favorites') || '[]');
      return Array.isArray(raw) ? raw.length : 0;
    } catch {
      return 0;
    }
  };
  const [n, setN] = useState(read);
  useEffect(() => {
    const update = () => setN(read());
    window.addEventListener('secretv4-favorites', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('secretv4-favorites', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return n;
}

/** Everything the achievements and the Stats page are worked out from */
export function useAchievementContext(): Context {
  const plays = usePlays();
  const collections = useCollections();
  const progress = useProgress();
  const favorites = useFavoriteCount();
  return useMemo(
    () =>
      buildContext({
        playedIds: Object.entries(plays.counts)
          .filter(([, n]) => n > 0)
          .map(([id]) => Number(id)),
        favorites,
        collections,
        seconds: totalSeconds(progress),
        days: progress.days.length,
      }),
    [plays.counts, collections, progress, favorites],
  );
}
