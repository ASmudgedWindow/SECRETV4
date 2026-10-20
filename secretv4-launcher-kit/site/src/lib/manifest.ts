import { useSyncExternalStore } from 'react';

/**
 * Reads games/manifest.json (written by the "Mirror games" workflow) so the site knows
 * which games have a copy hosted in this repo and can be played inside SecretV4.
 */
export interface ManifestGame {
  id: number;
  title: string;
  drive_id: string;
  file: string | null;
  mode: 'local' | 'drive' | 'missing' | 'failed';
  category?: string;
  drive_url?: string;
}

let byDriveId = new Map<string, ManifestGame>();
let version = 0;
const listeners = new Set<() => void>();
function bump() {
  version++;
  listeners.forEach((l) => l());
}

/** Re-renders a component once the manifest has loaded, so badges and filters are correct */
export function useManifestVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
  );
}
let loading: Promise<void> | null = null;

/** Full address of a copied game file, e.g. https://you.github.io/repo/games/clADarkRoom.html */
export function gameFileUrl(file: string): string {
  return new URL('games/' + encodeURIComponent(file), document.baseURI).toString();
}

/** Safe to call many times: the manifest is only fetched once. */
export function loadManifest(): Promise<void> {
  if (!loading) {
    const url = new URL('games/manifest.json', document.baseURI).toString();
    loading = fetch(url, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no manifest'))))
      .then((data: { games?: ManifestGame[] }) => {
        const map = new Map<string, ManifestGame>();
        for (const g of data.games ?? []) {
          if (g.drive_id && !map.has(g.drive_id)) map.set(g.drive_id, g);
        }
        byDriveId = map;
        bump();
      })
      .catch(() => {
        // No manifest yet (or offline): every game just falls back to the Drive guide.
        byDriveId = new Map();
        bump();
      });
  }
  return loading;
}

export function driveIdFromUrl(url: string): string | null {
  const m = url.match(/\/d\/([\w-]+)/) ?? url.match(/[?&]id=([\w-]+)/);
  return m ? m[1] : null;
}

/** The hosted copy of a game, if there is one. */
export function findLocalGame(url: string): ManifestGame | undefined {
  const id = driveIdFromUrl(url);
  const g = id ? byDriveId.get(id) : undefined;
  return g && g.mode === 'local' && g.file ? g : undefined;
}

export type PlayMode = 'here' | 'external' | 'drive';

/** here = plays on this site, external = opens another website, drive = a Google Drive download */
export function playMode(url: string, driveOnly: boolean): PlayMode {
  if (!url.includes('drive.google.com')) return 'external';
  return !driveOnly && findLocalGame(url) ? 'here' : 'drive';
}

/** A random game that is hosted on this site (regular HTML games first, since they are the most reliable) */
export function randomLocalGame(): ManifestGame | undefined {
  const all = [...byDriveId.values()].filter((g) => g.mode === 'local' && g.file);
  const html = all.filter((g) => g.category === 'library');
  const pool = html.length ? html : all;
  return pool[Math.floor(Math.random() * pool.length)];
}
