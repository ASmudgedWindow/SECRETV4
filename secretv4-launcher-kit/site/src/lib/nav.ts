/**
 * Lets any part of the site (like the terminal) switch the main tab, and ask the Games tab to
 * show a category or fill in the search box.
 */
export type NavTab = 'games' | 'tools' | 'stuff' | 'achievements' | 'settings';

export interface GamesRequest {
  /** a Games sub-tab, like 'all' */
  category?: string;
  /** text to put in the search box */
  query?: string;
  /** put the cursor in the search box */
  focus?: boolean;
}

let pending: GamesRequest | null = null;

export function gotoTab(tab: NavTab, games: GamesRequest = {}) {
  pending = tab === 'games' ? games : null;
  window.dispatchEvent(new CustomEvent('secretv4-goto', { detail: { tab } }));
}

/** The Games tab calls this to pick up what was asked of it (once) */
export function takePending(): GamesRequest | null {
  const p = pending;
  pending = null;
  return p;
}
