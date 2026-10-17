import type { LibraryGame } from '@/data/gameLibrary';

/** Lowercase, no accents, no punctuation: "Pokémon: Red!" -> "pokemon red" */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

interface Entry {
  text: string;
  squashed: string;
  words: string[];
}

const cache = new Map<number, Entry>();

function entryFor(g: LibraryGame): Entry {
  let e = cache.get(g.id);
  if (!e) {
    const text = norm(`${g.title} ${g.system ?? ''} ${g.kind ?? ''}`);
    e = { text, squashed: text.replace(/ /g, ''), words: text.split(' ') };
    cache.set(g.id, e);
  }
  return e;
}

/** True if a and b differ by at most `max` single-letter edits */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

/**
 * How well a game matches a search. 0 means no match, higher is better.
 * Every word typed has to match something: the start of a word, part of the title,
 * the title with spaces removed ("mario64"), or a word with a small typo ("minecaft").
 * The platform is searchable too ("flash", "snes").
 */
export function searchScore(g: LibraryGame, query: string): number {
  const q = norm(query);
  if (!q) return 1;
  const e = entryFor(g);
  let score = 0;
  for (const t of q.split(' ')) {
    if (e.words.some((w) => w.startsWith(t))) score += 3;
    else if (e.text.includes(t)) score += 2;
    else if (t.length >= 3 && e.squashed.includes(t)) score += 1.5;
    else if (t.length >= 4) {
      const max = t.length >= 7 ? 2 : 1;
      if (e.words.some((w) => within(t, w, max) || within(t, w.slice(0, t.length), max))) score += 1;
      else return 0;
    } else return 0;
  }
  if (e.text.startsWith(q)) score += 5;
  else if (e.text.includes(q)) score += 2;
  return score;
}
