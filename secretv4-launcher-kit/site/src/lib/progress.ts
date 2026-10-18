import { useSyncExternalStore } from 'react';
import type { Rarity } from '@/lib/rarity';

/**
 * Personal progress kept in this browser only: active time, streaks, records, one-off events and
 * which achievements are unlocked. Included in the Settings > Save backup file.
 */
interface ProgressData {
  since: number;
  /** game id -> active seconds spent in that game */
  seconds: Record<string, number>;
  /** days (YYYY-MM-DD) on which the site was actually used */
  days: string[];
  /** achievement id -> time unlocked */
  unlocked: Record<string, number>;
  /** total active seconds on the site */
  active: number;
  /** longest stretch of active time in one game, in seconds */
  bestSession: number;
  bestStreak: number;
  /** active seconds so far today */
  day: { date: string; seconds: number };
  bestDay: number;
  /** personal bests from the little tests in Stuff */
  records: { bestCps: number; bestReaction: number };
  /** one-off events (name -> time it first happened) */
  flags: Record<string, number>;
}

const KEY = 'secretv4-progress';
const num = (v: unknown, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);

function load(): ProgressData {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<ProgressData> | null;
    if (raw && typeof raw === 'object') {
      const rec = (raw.records ?? {}) as Partial<ProgressData['records']>;
      const day = (raw.day ?? {}) as Partial<ProgressData['day']>;
      return {
        since: num(raw.since, Date.now()),
        seconds: raw.seconds && typeof raw.seconds === 'object' ? raw.seconds : {},
        days: Array.isArray(raw.days) ? raw.days.filter((d) => typeof d === 'string').slice(-800) : [],
        unlocked: raw.unlocked && typeof raw.unlocked === 'object' ? raw.unlocked : {},
        active: num(raw.active),
        bestSession: num(raw.bestSession),
        bestStreak: num(raw.bestStreak),
        day: { date: typeof day.date === 'string' ? day.date : '', seconds: num(day.seconds) },
        bestDay: num(raw.bestDay),
        records: { bestCps: num(rec.bestCps), bestReaction: num(rec.bestReaction) },
        flags: raw.flags && typeof raw.flags === 'object' ? raw.flags : {},
      };
    }
  } catch {
    // ignore
  }
  return {
    since: Date.now(),
    seconds: {},
    days: [],
    unlocked: {},
    active: 0,
    bestSession: 0,
    bestStreak: 0,
    day: { date: '', seconds: 0 },
    bestDay: 0,
    records: { bestCps: 0, bestReaction: 0 },
    flags: {},
  };
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

export function getProgress(): ProgressData {
  return current;
}

/** Seconds spent in games (the in-site player) */
export function totalSeconds(p: ProgressData): number {
  return Object.values(p.seconds).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
}

// ---- days and streaks ----
export function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayNumber(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

/** current = days in a row up to today (or yesterday), best = longest run ever */
export function streaksOf(days: string[], today = todayString()): { current: number; best: number } {
  const nums = [...new Set(days.map(dayNumber))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let prev = -Infinity;
  for (const n of nums) {
    run = n === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = n;
  }
  const t = dayNumber(today);
  const last = nums[nums.length - 1];
  return { current: last !== undefined && (last === t || last === t - 1) ? run : 0, best };
}

/** Called when the person first does something on a new day */
export function markActiveDay() {
  const t = todayString();
  if (current.days.includes(t)) return;
  const days = [...current.days, t].slice(-800);
  commit({ ...current, days, bestStreak: Math.max(current.bestStreak, streaksOf(days, t).best) });
}

// ---- active time ----
export function addActive(a: { total: number; game?: number; gameSeconds?: number; session?: number }) {
  const date = todayString();
  const today = (current.day.date === date ? current.day.seconds : 0) + a.total;
  const seconds =
    a.game !== undefined && a.gameSeconds
      ? { ...current.seconds, [String(a.game)]: (current.seconds[String(a.game)] ?? 0) + a.gameSeconds }
      : current.seconds;
  commit({
    ...current,
    active: current.active + a.total,
    seconds,
    bestSession: Math.max(current.bestSession, a.session ?? 0),
    day: { date, seconds: today },
    bestDay: Math.max(current.bestDay, today),
  });
}

// ---- one-off events and records ----
export function hasFlag(name: string): boolean {
  return !!current.flags[name];
}

export function setFlag(name: string) {
  if (current.flags[name]) return;
  commit({ ...current, flags: { ...current.flags, [name]: Date.now() } });
}

export function setRecord(name: 'bestCps' | 'bestReaction', value: number) {
  if (!isFinite(value) || value <= 0) return;
  const old = current.records[name];
  const better = name === 'bestCps' ? value > old : old === 0 || value < old;
  if (better) commit({ ...current, records: { ...current.records, [name]: value } });
}

// ---- achievement pop-ups ----
export interface Toast {
  id: number;
  title: string;
  description: string;
  rarity: Rarity | null;
}
let toasts: Toast[] = [];
let toastId = 0;
const toastListeners = new Set<() => void>();

function setToasts(next: Toast[]) {
  toasts = next;
  toastListeners.forEach((l) => l());
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb);
      return () => toastListeners.delete(cb);
    },
    () => toasts,
  );
}

export function dismissToast(id: number) {
  setToasts(toasts.filter((t) => t.id !== id));
}

/** Saves newly earned achievements and queues pop-ups (rarest first, at most 3, then a "+N more") */
export function unlockAchievements(list: { id: string; name: string; description: string; rarity: Rarity }[], order: (r: Rarity) => number) {
  const now = Date.now();
  const unlocked = { ...current.unlocked };
  for (const a of list) if (!unlocked[a.id]) unlocked[a.id] = now;
  commit({ ...current, unlocked });

  const sorted = [...list].sort((a, b) => order(b.rarity) - order(a.rarity));
  const fresh: Toast[] = sorted.slice(0, 3).map((a) => ({ id: ++toastId, title: a.name, description: a.description, rarity: a.rarity }));
  if (sorted.length > 3) {
    fresh.push({ id: ++toastId, title: `+${sorted.length - 3} more achievements`, description: 'See them in Stuff, then Stats.', rarity: null });
  }
  setToasts([...toasts, ...fresh].slice(-5));
}
