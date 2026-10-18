import { addActive, hasFlag, markActiveDay, setFlag } from '@/lib/progress';

/**
 * Works out how long someone is really using the site.
 *
 * Time only counts while the tab is visible and there was some input (click, key press, touch,
 * scroll or controller button) in the last 5 minutes. After 5 minutes without input the timer pauses.
 * After 10 minutes without input the current game session resets. The total active time is never reset.
 */
const PAUSE_MS = 5 * 60 * 1000;
const RESET_MS = 10 * 60 * 1000;
const EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;

let lastInput = 0;
let lastTick = 0;
let lastDayCheck = 0;
let pending = 0;
let pendingGame = 0;
let session = 0;
let gameId: number | null = null;
let started = false;
let konami = 0;

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

function noteInput() {
  const now = Date.now();
  lastInput = now;
  // Cheap checks, at most every 30 seconds
  if (now - lastDayCheck > 30000) {
    lastDayCheck = now;
    markActiveDay();
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 5 && !hasFlag('nightOwl')) setFlag('nightOwl');
  }
}

function onKey(e: KeyboardEvent) {
  noteInput();
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  konami = key === KONAMI[konami] ? konami + 1 : key === KONAMI[0] ? 1 : 0;
  if (konami === KONAMI.length) {
    konami = 0;
    setFlag('konami');
  }
}

function pollGamepads() {
  try {
    for (const pad of navigator.getGamepads?.() ?? []) {
      if (!pad) continue;
      if (pad.buttons.some((b) => b.pressed) || pad.axes.some((a) => Math.abs(a) > 0.6)) {
        noteInput();
        return;
      }
    }
  } catch {
    // ignore
  }
}

function flush() {
  if (pending <= 0) return;
  addActive({ total: pending, game: gameId ?? undefined, gameSeconds: pendingGame, session });
  pending = 0;
  pendingGame = 0;
}

function tick() {
  const now = Date.now();
  const dt = Math.min((now - lastTick) / 1000, 2); // never count more than 2s per tick (sleep, lag)
  lastTick = now;
  if (document.visibilityState !== 'visible') return;
  if (gameId !== null) pollGamepads();
  const idle = now - lastInput;
  if (lastInput === 0 || idle >= RESET_MS) session = 0;
  if (lastInput !== 0 && idle < PAUSE_MS) {
    pending += dt;
    if (gameId !== null) {
      pendingGame += dt;
      session += dt;
    }
    if (pending >= 5) flush();
  }
}

/** Starts watching. Safe to call more than once. */
export function startActivityTracking() {
  if (started || typeof window === 'undefined') return;
  started = true;
  lastTick = Date.now();
  for (const e of EVENTS) window.addEventListener(e, noteInput, { capture: true, passive: true });
  window.addEventListener('keydown', onKey, true);
  window.setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  window.addEventListener('pagehide', flush);
}

/** A game was opened in the player: time now also counts towards that game's session */
export function beginGameSession(id: number) {
  flush();
  gameId = id;
  session = 0;
  pendingGame = 0;
}

export function endGameSession() {
  flush();
  gameId = null;
  session = 0;
  pendingGame = 0;
}

/**
 * Inputs inside a game's frame do not reach the page, so listen inside it too.
 * This only works for games hosted on this site; games in frames from other sites cannot be observed.
 */
export function watchFrame(frame: HTMLIFrameElement): () => void {
  const attached = new WeakSet<Window>();
  const attach = (w: Window | null) => {
    try {
      if (!w || attached.has(w)) return;
      attached.add(w);
      for (const e of EVENTS) w.addEventListener(e, noteInput, { capture: true, passive: true });
      for (let i = 0; i < w.frames.length; i++) attach(w.frames[i]);
    } catch {
      // another site's frame: not allowed to look inside
    }
  };
  const scan = () => attach(frame.contentWindow);
  frame.addEventListener('load', scan);
  const t = window.setInterval(scan, 5000); // some games add frames after loading
  scan();
  return () => {
    window.clearInterval(t);
    frame.removeEventListener('load', scan);
  };
}

