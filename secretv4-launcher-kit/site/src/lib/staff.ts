import { useSyncExternalStore } from 'react';
import { getSiteConfig } from '@/lib/siteConfig';

/**
 * What the staff have put in front of every visitor: Staff Picks and live events.
 * Read from the counter's public /staff address. Without a counter address this stays empty.
 */
export interface StaffEvent {
  id: number;
  kind: string;
  title: string;
  descr: string;
  games: number[];
  /** when it ends, in the server's clock (seconds) */
  ends: number;
}

interface StaffData {
  picks: number[];
  events: StaffEvent[];
  /** server clock minus this browser's clock, in seconds */
  skew: number;
}

let data: StaffData = { picks: [], events: [], skew: 0 };
const listeners = new Set<() => void>();
let started = false;

async function refresh() {
  const { statsUrl } = getSiteConfig();
  if (!statsUrl) return;
  try {
    const res = await fetch(`${statsUrl}/staff`);
    if (!res.ok) return;
    const d = (await res.json()) as { now?: number; picks?: unknown; events?: unknown };
    const picks = Array.isArray(d.picks) ? (d.picks as unknown[]).filter((n): n is number => Number.isInteger(n)) : [];
    const events = Array.isArray(d.events)
      ? (d.events as StaffEvent[]).filter((e) => e && typeof e.title === 'string' && Array.isArray(e.games) && typeof e.ends === 'number')
      : [];
    data = { picks, events, skew: typeof d.now === 'number' ? d.now - Math.floor(Date.now() / 1000) : 0 };
    listeners.forEach((l) => l());
  } catch {
    // offline or the counter is down: keep whatever we had
  }
}

function start() {
  if (started) return;
  started = true;
  void refresh();
  window.setInterval(() => document.visibilityState === 'visible' && void refresh(), 5 * 60 * 1000);
}

export function useStaff(): StaffData {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      start();
      return () => listeners.delete(cb);
    },
    () => data,
  );
}

/** Seconds left in an event, by the server's clock */
export function secondsLeft(e: StaffEvent, skew: number): number {
  return Math.max(0, e.ends - (Math.floor(Date.now() / 1000) + skew));
}

export function formatLeft(sec: number): string {
  if (sec < 90) return 'under a minute left';
  if (sec < 3600) return `${Math.round(sec / 60)} min left`;
  if (sec < 86400) return `${(sec / 3600).toFixed(1).replace(/\.0$/, '')} hr left`;
  return `${(sec / 86400).toFixed(1).replace(/\.0$/, '')} days left`;
}
