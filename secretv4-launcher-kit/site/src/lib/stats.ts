import { useSyncExternalStore } from 'react';
import { getSiteConfig } from '@/lib/siteConfig';

/**
 * Talks to the play counter (a small Cloudflare Worker you set up).
 * If no counter address is set in site-config.js, or it is offline, nothing here does anything
 * and the site falls back to each device's own play history.
 */
export interface TopEntry {
  id: number;
  n: number;
}

let top: TopEntry[] | null = null;
let started = false;
const listeners = new Set<() => void>();

function start() {
  if (started) return;
  started = true;
  const { statsUrl } = getSiteConfig();
  if (!statsUrl) return;
  fetch(`${statsUrl}/top`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('stats offline'))))
    .then((d: { top?: unknown }) => {
      if (!Array.isArray(d.top)) return;
      top = (d.top as TopEntry[]).filter((e) => e && Number.isInteger(e.id) && typeof e.n === 'number');
      listeners.forEach((l) => l());
    })
    .catch(() => {});
}

/** Everyone's most played games, or null while loading or if the counter is not available */
export function useGlobalTop(): TopEntry[] | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      start();
      return () => listeners.delete(cb);
    },
    () => top,
  );
}

/** Tells the counter about one play. Fails silently. */
export function reportPlay(id: number) {
  const { statsUrl } = getSiteConfig();
  if (!statsUrl) return;
  // text/plain keeps this a "simple" request, so the browser doesn't need an extra permission check first
  fetch(`${statsUrl}/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ id }),
    keepalive: true,
  }).catch(() => {});
}
