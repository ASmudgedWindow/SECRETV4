import type { LineKind } from '@/lib/terminalCommands';

// ---------------------------------------------------------------------------
// What the terminal has printed. Kept outside the component so leaving the tab and coming back keeps it.
// ---------------------------------------------------------------------------
export interface Line {
  id: number;
  text: string;
  kind: LineKind;
  onClick?: () => void;
  widget?: 'draw' | 'frame';
}

let lines: Line[] = [];
let nextId = 1;
let bannerShown = false;
const listeners = new Set<() => void>();
export const history: string[] = [];
export const MAX_LINES = 400;
const UNLOCK_KEY = 'secretv4-terminal-unlocked';
let typeToken = 0;
let spamTimer: number | null = null;

const emit = () => listeners.forEach((l) => l());
export const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function addLine(l: Omit<Line, 'id'>): number {
  const id = nextId++;
  lines = [...lines, { ...l, id }].slice(-MAX_LINES);
  emit();
  return id;
}
export function updateLine(id: number, text: string) {
  lines = lines.map((l) => (l.id === id ? { ...l, text } : l));
  emit();
}
export function removeLine(id: number) {
  lines = lines.filter((l) => l.id !== id);
  emit();
}
export function stopSpam() {
  if (spamTimer !== null) window.clearInterval(spamTimer);
  spamTimer = null;
}
export function stopRunning() {
  typeToken++;
  stopSpam();
}
export function clearAll() {
  stopRunning();
  lines = [];
  emit();
}
export function startSpam() {
  stopSpam();
  // Plenty of lines, but only the newest 400 are kept so the page never bogs down
  spamTimer = window.setInterval(() => {
    const extra = Array.from({ length: 4 }, () => ({ id: nextId++, text: 'AAAAAAAAAAA', kind: 'out' as LineKind }));
    lines = [...lines, ...extra].slice(-MAX_LINES);
    emit();
  }, 80);
}

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

export async function typewriter(text: string, opts?: { pauseAfter?: string }) {
  const token = ++typeToken;
  const id = addLine({ text: '', kind: 'out' });
  let paused = false;
  for (let i = 0; i < text.length; i++) {
    if (token !== typeToken) return;
    updateLine(id, text.slice(0, i + 1));
    const stop = opts?.pauseAfter && !paused && text.slice(0, i + 1).endsWith(opts.pauseAfter);
    if (stop) paused = true;
    await sleep(stop ? 800 : 50 + Math.random() * 30);
  }
}

// ---- secret commands you have found (they show up in help) ----
function loadUnlocked(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(UNLOCK_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
let unlockedIds = loadUnlocked();
export const getUnlocked = () => unlockedIds;
export const getLines = () => lines;
/** True the first time it is asked, so the welcome line is only printed once */
export function takeBanner(): boolean {
  if (bannerShown || lines.length > 0) return false;
  bannerShown = true;
  return true;
}
export function unlock(id: string) {
  if (unlockedIds.includes(id)) return;
  unlockedIds = [...unlockedIds, id];
  try {
    localStorage.setItem(UNLOCK_KEY, JSON.stringify(unlockedIds));
  } catch {
    // ignore
  }
}

