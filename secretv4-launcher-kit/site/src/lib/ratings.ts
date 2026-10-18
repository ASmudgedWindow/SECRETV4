import { useSyncExternalStore } from 'react';
import { getSiteConfig } from '@/lib/siteConfig';
import { voterId } from '@/lib/stats';

/**
 * Thumbs up / thumbs down for games, shared through the same counter as the play totals.
 * Turned off automatically when no counter address is set in site-config.js.
 */
export interface Rating {
  up: number;
  down: number;
}

/** A score is only shown once a game has at least this many votes */
export const MIN_VOTES = 5;

interface RatingsState {
  ratings: Map<number, Rating>;
  /** this browser's own votes: game id -> 1 (up) or -1 (down) */
  mine: Record<string, number>;
}

const MINE_KEY = 'secretv4-my-votes';

function loadMine(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(MINE_KEY) || '{}') as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) if (v === 1 || v === -1) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

let state: RatingsState = { ratings: new Map(), mine: loadMine() };
let started = false;
const listeners = new Set<() => void>();

function setState(next: Partial<RatingsState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function ratingsEnabled(): boolean {
  return !!getSiteConfig().statsUrl;
}

function start() {
  if (started) return;
  started = true;
  const { statsUrl } = getSiteConfig();
  if (!statsUrl) return;
  fetch(`${statsUrl}/ratings`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('offline'))))
    .then((d: { ratings?: unknown }) => {
      if (!Array.isArray(d.ratings)) return;
      const map = new Map<number, Rating>();
      for (const row of d.ratings as unknown[]) {
        if (Array.isArray(row) && row.length === 3 && row.every((x) => typeof x === 'number')) {
          map.set(row[0], { up: row[1], down: row[2] });
        }
      }
      // Keep this session's own changes on top of the downloaded totals
      setState({ ratings: new Map([...map, ...[...state.ratings].filter(([id]) => !map.has(id))]) });
    })
    .catch(() => {});
}

export function useRatings(): RatingsState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      start();
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

/** Tapping the same button again takes the vote back */
export function castVote(id: number, vote: 1 | -1) {
  const { statsUrl } = getSiteConfig();
  if (!statsUrl) return;
  const key = String(id);
  const before = state.mine[key] ?? 0;
  const next = before === vote ? 0 : vote;

  const mine = { ...state.mine };
  if (next === 0) delete mine[key];
  else mine[key] = next;
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(mine));
  } catch {
    // ignore
  }

  const ratings = new Map(state.ratings);
  const r = ratings.get(id) ?? { up: 0, down: 0 };
  ratings.set(id, {
    up: Math.max(0, r.up + (next === 1 ? 1 : 0) - (before === 1 ? 1 : 0)),
    down: Math.max(0, r.down + (next === -1 ? 1 : 0) - (before === -1 ? 1 : 0)),
  });
  setState({ mine, ratings });

  fetch(`${statsUrl}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ id, v: voterId(), vote: next }),
    keepalive: true,
  }).catch(() => {});
}

/** Percentage of votes that are thumbs up, or null if there are too few votes to say */
export function likedPercent(r: Rating | undefined): number | null {
  if (!r || r.up + r.down < MIN_VOTES) return null;
  return Math.round((r.up / (r.up + r.down)) * 100);
}

/**
 * Ranking score that does not let 3 votes beat 300 (lower bound of the Wilson interval).
 * Games with too few votes score 0.
 */
export function ratingScore(r: Rating | undefined): number {
  if (!r) return 0;
  const n = r.up + r.down;
  if (n < MIN_VOTES) return 0;
  const z = 1.96;
  const p = r.up / n;
  return (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / (1 + (z * z) / n);
}
