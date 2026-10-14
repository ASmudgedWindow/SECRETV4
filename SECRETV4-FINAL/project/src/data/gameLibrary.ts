import rawData from './secretv4_games.json';
import { gameNames } from './gameNames';
import { extraGames, type GameKind } from './extraGames';

export interface LibraryGame {
  id: number;
  title: string;
  /** Link taken straight from secretv4_games.json */
  url: string;
  /** Set for Flash and emulated games */
  kind?: GameKind;
  /** Console / platform label for Flash and emulated games */
  system?: string;
}

interface RawGameEntry {
  id: number;
  title: string;
  original_link_text: string;
  url: string;
}

const rawGames = rawData as RawGameEntry[];

const hasWordChars = (s: string) => /[a-z0-9]/i.test(s);

/** Pick the best human-readable title for an entry, or '' if none is usable. */
function cleanTitle(entry: RawGameEntry): string {
  if (gameNames[entry.id]) return gameNames[entry.id];
  const title = entry.title?.trim() ?? '';
  const isPlaceholder = !title || /^untitled game \d+$/i.test(title) || !hasWordChars(title);
  if (!isPlaceholder) return title.charAt(0).toUpperCase() + title.slice(1);

  const fallback = (entry.original_link_text ?? '')
    .trim()
    .replace(/^cl/, '')
    .replace(/\.html?$/i, '');
  return hasWordChars(fallback) ? fallback.charAt(0).toUpperCase() + fallback.slice(1) : '';
}

/** Google Drive file id, so /file/d/ID/view and open?id=ID count as the same game. */
function dedupeKey(url: string): string {
  const m = url.match(/\/d\/([\w-]+)/) ?? url.match(/[?&]id=([\w-]+)/);
  return m ? m[1] : url;
}

const skipped: { id: number; title: string; reason: string }[] = [];
const byKey = new Map<string, LibraryGame>();

for (const entry of rawGames) {
  if (!entry.url || !entry.url.startsWith('http')) {
    skipped.push({ id: entry.id, title: entry.title, reason: 'Missing or invalid URL' });
    continue;
  }
  const title = cleanTitle(entry);
  if (!title) {
    skipped.push({ id: entry.id, title: entry.title, reason: 'No valid title' });
    continue;
  }
  const key = dedupeKey(entry.url);
  if (byKey.has(key)) {
    skipped.push({ id: entry.id, title, reason: 'Duplicate link' });
    continue;
  }
  byKey.set(key, { id: entry.id, title, url: entry.url });
}

// Flash and emulated games from the link doc. If a link is already in the library the existing
// game is just tagged (never listed twice).
for (const extra of extraGames) {
  const url = extra.file.startsWith('http') ? extra.file : `https://drive.google.com/file/d/${extra.file}/view?usp=sharing`;
  const key = dedupeKey(url);
  const existing = byKey.get(key);
  if (existing) {
    existing.kind = extra.kind;
    existing.system = extra.system;
    continue;
  }
  byKey.set(key, { id: extra.id, title: extra.title, url, kind: extra.kind, system: extra.system });
}

const letterOf = (title: string) => {
  const l = title[0].toUpperCase();
  return /[A-Z]/.test(l) ? l : '#';
};

export const libraryGames: LibraryGame[] = [...byKey.values()].sort((a, b) => {
  const la = letterOf(a.title);
  const lb = letterOf(b.title);
  if (la !== lb) return la === '#' ? 1 : lb === '#' ? -1 : la.localeCompare(lb);
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true });
});

export const gameLetter = (g: LibraryGame) => letterOf(g.title);

export const libraryLetters: string[] = [...new Set(libraryGames.map(gameLetter))].sort((a, b) =>
  a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b),
);

export const importStats = {
  total: rawGames.length,
  imported: libraryGames.length,
  skipped: skipped.length,
  skippedEntries: skipped,
};
