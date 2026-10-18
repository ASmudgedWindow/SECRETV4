import { useEffect, useMemo, useState } from 'react';
import { libraryGames, type LibraryGame } from '@/data/gameLibrary';
import { rageBaitGames } from '@/data/categories';
import { usePlays } from '@/lib/plays';
import { useCollections, type Collection } from '@/lib/collections';
import { useProgress } from '@/lib/progress';
import type { Rarity } from '@/lib/rarity';

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
  active: number;
  bestSession: number;
  bestStreak: number;
  bestDay: number;
  bestCps: number;
  bestReaction: number;
  flags: Record<string, number>;
}

export interface Context {
  distinctGames: number;
  categories: PlayCategory[];
  retro: boolean;
  flash: boolean;
  favorites: number;
  collections: number;
  biggestCollection: number;
  active: number;
  bestSession: number;
  bestStreak: number;
  bestDay: number;
  bestCps: number;
  bestReaction: number;
  flags: Record<string, number>;
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
    flash: cats.has('Flash'),
    favorites: i.favorites,
    collections: i.collections.length,
    biggestCollection: i.collections.reduce((m, c) => Math.max(m, c.games.length), 0),
    active: i.active,
    bestSession: i.bestSession,
    bestStreak: i.bestStreak,
    bestDay: i.bestDay,
    bestCps: i.bestCps,
    bestReaction: i.bestReaction,
    flags: i.flags,
  };
}

export type Section =
  | 'Games played'
  | 'Favorites'
  | 'Customizing'
  | 'Active time'
  | 'One game, one session'
  | 'Streaks'
  | 'Extras'
  | 'Secret';

export const SECTIONS: Section[] = [
  'Games played',
  'Favorites',
  'Customizing',
  'Active time',
  'One game, one session',
  'Streaks',
  'Extras',
  'Secret',
];

export interface Achievement {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  section: Section;
  target: number;
  value: (c: Context) => number;
  /** Used when "reached the target" is not simply value >= target */
  done?: (c: Context) => boolean;
  display?: (n: number) => string;
}

export const isDone = (a: Achievement, c: Context) => (a.done ? a.done(c) : a.value(c) >= a.target);

const min = (n: number) => n * 60;
const hr = (n: number) => n * 3600;

export function formatDuration(sec: number): string {
  if (sec < 3600) return `${Math.floor(sec / 60)} min`;
  const h = sec / 3600;
  return h < 10 ? `${h.toFixed(1).replace(/\.0$/, '')} hr` : `${Math.floor(h)} hr`;
}

const flag = (name: string) => (c: Context) => (c.flags[name] ? 1 : 0);

function a(
  section: Section,
  id: string,
  name: string,
  description: string,
  rarity: Rarity,
  target: number,
  value: (c: Context) => number,
  extra: Partial<Achievement> = {},
): Achievement {
  return { id, name, description, rarity, section, target, value, ...extra };
}

const games = (c: Context) => c.distinctGames;
const favs = (c: Context) => c.favorites;
const active = (c: Context) => c.active;
const session = (c: Context) => c.bestSession;
const streak = (c: Context) => c.bestStreak;
const time = { display: formatDuration };

export const ACHIEVEMENTS: Achievement[] = [
  // ---- games played ----
  a('Games played', 'first-game', 'First Game', 'Play your first game.', 'common', 1, games),
  a('Games played', 'games-10', 'Getting Started', 'Play 10 different games.', 'common', 10, games),
  a('Games played', 'games-50', 'Regular Player', 'Play 50 different games.', 'rare', 50, games),
  a('Games played', 'games-100', 'Century', 'Play 100 different games.', 'epic', 100, games),
  a('Games played', 'games-500', 'Half a Thousand', 'Play 500 different games.', 'legendary', 500, games),
  a('Games played', 'games-1000', 'Game Veteran', 'Play 1,000 different games.', 'nolife', 1000, games),

  // ---- favorites ----
  a('Favorites', 'fav-1', 'First Favorite', 'Favorite a game.', 'common', 1, favs),
  a('Favorites', 'fav-5', 'Starred', 'Favorite 5 games.', 'common', 5, favs),
  a('Favorites', 'fav-20', 'Collector', 'Favorite 20 games.', 'rare', 20, favs),
  a('Favorites', 'fav-100', 'Hoarder', 'Favorite 100 games.', 'epic', 100, favs),

  // ---- customizing ----
  a('Customizing', 'theme-changed', 'Fresh Look', 'Change the theme for the first time.', 'common', 1, flag('themeChanged')),
  a('Customizing', 'background-changed', 'New Scenery', 'Change the background for the first time.', 'common', 1, flag('backgroundChanged')),

  // ---- active time on the site ----
  a('Active time', 'active-5m', 'Just Visiting', 'Be active on SecretV4 for 5 minutes.', 'common', min(5), active, time),
  a('Active time', 'active-20m', 'Settling In', 'Be active on SecretV4 for 20 minutes.', 'common', min(20), active, time),
  a('Active time', 'active-1h', 'Hooked', 'Be active on SecretV4 for 1 hour.', 'rare', hr(1), active, time),
  a('Active time', 'active-5h', 'Part-Timer', 'Be active on SecretV4 for 5 hours.', 'rare', hr(5), active, time),
  a('Active time', 'active-12h', 'Full Shift', 'Be active on SecretV4 for 12 hours.', 'epic', hr(12), active, time),
  a('Active time', 'active-24h', 'A Whole Day', 'Be active on SecretV4 for 24 hours.', 'epic', hr(24), active, time),
  a('Active time', 'active-48h', 'Two Days Gone', 'Be active on SecretV4 for 48 hours.', 'legendary', hr(48), active, time),
  a('Active time', 'active-100h', 'Hundred Hours', 'Be active on SecretV4 for 100 hours.', 'legendary', hr(100), active, time),
  a('Active time', 'active-1000h', 'HOW DO YOU EVEN DO THIS?!', 'Be active on SecretV4 for 1,000 hours.', 'nolife', hr(1000), active, time),

  // ---- one game, one session ----
  a('One game, one session', 'session-10m', 'Warmed Up', 'Stay active in one game for 10 minutes in one session.', 'common', min(10), session, time),
  a('One game, one session', 'session-30m', 'In the Zone', 'Stay active in one game for 30 minutes in one session.', 'rare', min(30), session, time),
  a('One game, one session', 'session-1h', 'Hour of Power', 'Stay active in one game for 1 hour in one session.', 'rare', hr(1), session, time),
  a('One game, one session', 'session-3h', 'Deep Dive', 'Stay active in one game for 3 hours in one session.', 'epic', hr(3), session, time),
  a('One game, one session', 'session-5h', 'No Breaks', 'Stay active in one game for 5 hours in one session.', 'epic', hr(5), session, time),
  a('One game, one session', 'session-10h', 'Iron Thumbs', 'Stay active in one game for 10 hours in one session.', 'legendary', hr(10), session, time),
  a('One game, one session', 'session-24h', 'Touch grass', 'Stay active in one game for 24 hours in one session.', 'nolife', hr(24), session, time),

  // ---- streaks ----
  a('Streaks', 'streak-2', 'Back Again', 'Use SecretV4 2 days in a row.', 'common', 2, streak),
  a('Streaks', 'streak-5', 'On a Roll', 'Use SecretV4 5 days in a row.', 'common', 5, streak),
  a('Streaks', 'streak-7', 'Week Warrior', 'Use SecretV4 7 days in a row.', 'rare', 7, streak),
  a('Streaks', 'streak-12', 'Dozen Days', 'Use SecretV4 12 days in a row.', 'rare', 12, streak),
  a('Streaks', 'streak-20', 'Habit Formed', 'Use SecretV4 20 days in a row.', 'epic', 20, streak),
  a('Streaks', 'streak-30', 'Monthly Regular', 'Use SecretV4 30 days in a row.', 'epic', 30, streak),
  a('Streaks', 'streak-40', 'Forty Days', 'Use SecretV4 40 days in a row.', 'epic', 40, streak),
  a('Streaks', 'streak-50', 'Half Century', 'Use SecretV4 50 days in a row.', 'legendary', 50, streak),
  a('Streaks', 'streak-75', 'Seventy-Five Alive', 'Use SecretV4 75 days in a row.', 'legendary', 75, streak),
  a('Streaks', 'streak-100', 'Hundred Days', 'Use SecretV4 100 days in a row.', 'legendary', 100, streak),
  a('Streaks', 'streak-200', 'Two Hundred Days', 'Use SecretV4 200 days in a row.', 'nolife', 200, streak),
  a('Streaks', 'streak-365', 'A Full Year', 'Use SecretV4 365 days in a row.', 'nolife', 365, streak),

  // ---- extras ----
  a('Extras', 'organized', 'Organized', 'Create a collection.', 'common', 1, (c) => c.collections),
  a('Extras', 'curator', 'Curator', 'Put 5 games in one collection.', 'rare', 5, (c) => c.biggestCollection),
  a('Extras', 'librarian', 'Librarian', 'Create 5 collections.', 'epic', 5, (c) => c.collections),
  a('Extras', 'explorer', 'Explorer', 'Play games from 4 categories: Library, Ragebait, Flash and Emulated.', 'rare', 4, (c) => c.categories.length),
  a('Extras', 'retro-fan', 'Retro Fan', 'Play a game from a retro console.', 'common', 1, (c) => (c.retro ? 1 : 0)),
  a('Extras', 'flashback', 'Flashback', 'Play a Flash game.', 'common', 1, (c) => (c.flash ? 1 : 0)),
  a('Extras', 'backed-up', 'Backed Up', 'Download a save backup from Settings.', 'common', 1, flag('backedUp')),
  a('Extras', 'night-owl', 'Night Owl', 'Use SecretV4 between 2 and 5 in the morning.', 'rare', 1, flag('nightOwl')),
  a('Extras', 'full-day', 'Full Day', 'Be active for 3 hours in a single day.', 'epic', hr(3), (c) => c.bestDay, time),

  // ---- secret ----
  a('Secret', 'cps-10', 'Okay pretty fast', 'Get over 10 CPS on the click speed test.', 'secret', 10, (c) => c.bestCps, { done: (c) => c.bestCps > 10 }),
  a('Secret', 'cps-20', 'OKAY VERY FAST', 'Get over 20 CPS on the click speed test.', 'secret', 20, (c) => c.bestCps, { done: (c) => c.bestCps > 20 }),
  a('Secret', 'cps-50', 'Wow nice autoclicker', 'Get over 50 CPS on the click speed test.', 'secret', 50, (c) => c.bestCps, { done: (c) => c.bestCps > 50 }),
  a('Secret', 'rt-300', 'Quick Draw', 'Get under 300 ms on the reaction test.', 'secret', 1, (c) => (c.bestReaction > 0 && c.bestReaction < 300 ? 1 : 0)),
  a('Secret', 'rt-200', 'Snap Reaction', 'Get under 200 ms on the reaction test.', 'secret', 1, (c) => (c.bestReaction > 0 && c.bestReaction < 200 ? 1 : 0)),
  a('Secret', 'rt-100', 'Faster Than Thought', 'Get under 100 ms on the reaction test.', 'secret', 1, (c) => (c.bestReaction > 0 && c.bestReaction < 100 ? 1 : 0)),
  a('Secret', 'rt-50', 'Impossible?', 'Get under 50 ms on the reaction test.', 'secret', 1, (c) => (c.bestReaction > 0 && c.bestReaction < 50 ? 1 : 0)),
  a('Secret', 'nat-20', 'Natural 20', 'Roll a natural 20 on the d20.', 'secret', 1, flag('nat20')),
  a('Secret', 'boring', 'Boringgg', 'Turn off your background.', 'secret', 1, flag('backgroundOff')),
  a('Secret', 'rickroll', 'GET RICKROLLED!!!!', 'Click the V in the SecretV4 title.', 'secret', 1, flag('rickroll')),
  a('Secret', 'konami', 'Old School', 'Enter a famous cheat code.', 'secret', 1, flag('konami')),
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
        active: progress.active,
        bestSession: progress.bestSession,
        bestStreak: progress.bestStreak,
        bestDay: progress.bestDay,
        bestCps: progress.records.bestCps,
        bestReaction: progress.records.bestReaction,
        flags: progress.flags,
      }),
    [plays.counts, collections, progress, favorites],
  );
}
