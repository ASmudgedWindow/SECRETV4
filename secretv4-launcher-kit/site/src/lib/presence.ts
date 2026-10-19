/** What this browser is currently looking at, reported (anonymously) in the online check-in */
let page = '';
let game = '';

export const setPresencePage = (p: string) => {
  page = p;
};
export const setPresenceGame = (g: string) => {
  game = g;
};
export const getPresence = () => ({ page, game });
