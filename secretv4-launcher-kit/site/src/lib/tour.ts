/**
 * The welcome tour: steps, step-by-step state, where to put the pop-up, and the "already seen it" memory.
 * Kept free of React so it can be tested on its own.
 */
export type TourTab = 'games' | 'tools' | 'stuff' | 'achievements' | 'settings';

export interface TourStep {
  /** Which main tab to be on for this step */
  tab?: TourTab;
  /** The data-tour="..." name of the thing to highlight. No target = a card in the middle of the screen. */
  target?: string;
  title: string;
  text: string;
}

export const STEPS: TourStep[] = [
  {
    tab: 'games',
    title: 'Welcome to SecretV4',
    text: "Here's a quick tour, about a minute. You can skip it whenever you like, and you can replay it later from Settings.",
  },
  {
    tab: 'games',
    target: 'tab-games',
    title: 'Games',
    text: 'Over 2,700 games live here. Games hosted on SecretV4 open right inside the site. The rest give you a Google Drive download.',
  },
  {
    tab: 'games',
    target: 'games-search',
    title: 'Search',
    text: 'Search by name, even with a typo. You can also search genres, like platformer, two player or arcade.',
  },
  {
    tab: 'games',
    target: 'games-subtabs',
    title: 'Ways to browse',
    text: 'Recent, Featured (the most played), Staff Picks and live events, your own Collections, and Genres. Tap the star on a game to favorite it, or the folder to add it to a collection.',
  },
  {
    tab: 'tools',
    target: 'tab-tools',
    title: 'Tools',
    text: 'Handy things: a calculator, timer, notes, a password generator, converters and more.',
  },
  {
    tab: 'stuff',
    target: 'tab-stuff',
    title: 'Stuff',
    text: 'About the site, plus a few quick time-wasters like the reaction test and the click speed test.',
  },
  {
    tab: 'achievements',
    target: 'tab-achievements',
    title: 'Achievements',
    text: '60 achievements in six rarities, plus your personal stats. Some of them are hidden, so poke around.',
  },
  {
    tab: 'settings',
    target: 'tab-settings',
    title: 'Settings',
    text: 'Change the theme and background, turn on the tab cloak, or make games open as Google Drive links instead.',
  },
  {
    tab: 'settings',
    target: 'content',
    title: 'Back up your stuff',
    text: 'Your favorites, collections, achievements and most game saves live in this browser. Use Save backup here so you never lose them.',
  },
  {
    tab: 'games',
    title: "You're all set",
    text: 'Have fun. You can replay this tour any time from Settings.',
  },
];

// ---- one step at a time ----
export interface TourState {
  open: boolean;
  i: number;
}
export type TourAction = { type: 'start' } | { type: 'next' } | { type: 'back' } | { type: 'close' };

export function tourReducer(s: TourState, a: TourAction, total = STEPS.length): TourState {
  switch (a.type) {
    case 'start':
      return { open: true, i: 0 };
    case 'next':
      return s.i >= total - 1 ? { open: false, i: 0 } : { open: true, i: s.i + 1 };
    case 'back':
      return { ...s, i: Math.max(0, s.i - 1) };
    case 'close':
      return { open: false, i: 0 };
  }
}

// ---- remembering that it has been shown ----
const DONE_KEY = 'secretv4-tour-is-done';

/** True once the tour has been finished or skipped. If storage is blocked we also say true, so it never nags. */
export function tourDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return true;
  }
}

export function markTourDone() {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    // ignore
  }
}

// ---- where the pop-up goes ----
export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * Picks a spot for the pop-up that stays on screen: beside things on the left edge (the sidebar),
 * otherwise below the highlighted thing, otherwise above it, otherwise at the bottom of the screen.
 */
export function placeCard(target: Box | null, vw: number, vh: number, cardW: number, cardH: number, gap = 14): { top: number; left: number } {
  if (!target) return { left: Math.max(gap, (vw - cardW) / 2), top: Math.max(gap, (vh - cardH) / 2) };
  const roomRight = vw - (target.left + target.width) - gap;
  if (roomRight >= cardW + gap && target.left < vw * 0.4 && target.width < vw * 0.5) {
    return { left: target.left + target.width + gap, top: clamp(target.top + target.height / 2 - cardH / 2, gap, vh - cardH - gap) };
  }
  const below = vh - (target.top + target.height) - gap;
  if (below >= cardH + gap) return { left: clamp(target.left, gap, vw - cardW - gap), top: target.top + target.height + gap };
  const above = target.top - gap;
  if (above >= cardH + gap) return { left: clamp(target.left, gap, vw - cardW - gap), top: target.top - cardH - gap };
  return { left: Math.max(gap, (vw - cardW) / 2), top: Math.max(gap, vh - cardH - gap) };
}
