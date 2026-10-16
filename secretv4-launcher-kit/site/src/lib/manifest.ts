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
}

let byDriveId = new Map<string, ManifestGame>();
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
      })
      .catch(() => {
        // No manifest yet (or offline): every game just falls back to the Drive guide.
        byDriveId = new Map();
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
