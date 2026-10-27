/**
 * The little line of text under the loading screen. One is picked at random each visit.
 * To add one, put a new line in this list. Keep them short.
 */
export const SPLASHES: string[] = [
  'Also Try Minecraft!',
  'May contain soybeans',
  'Large Spine',
  'Kinda Cheesy',
  'The Chicken is Ready',
  'Also Try Undertale!',
  'Do you ever go outside?',
  'Spine-Tingling!',
  'Technoblade Never Dies!',
  'You are filled with Determination',
  'In this world... It\'s kill or be killed',
  'waxed lightly weathered cut copper stairs',
  '...',
  'I am feeling very malevolent today...',
  'https://tinyurl.com/i-dare-you-to-copy-this-link',
  'click me',
  'grubby',
  'drive mad, drive mad.',
  'farts',
  'what is grass anyway?',
  'Its a beautiful day outside.',
  'As a child, I yearned for the mines.',
  'FORNITE BATTLE PASS!!! (SHUT UP!!!)',
  'Friends dont lie...',
  'Welcome to Hawkings, Indiana!',
  'mouthbreather!',
  'HAWKINGS LAB??!?!?!??!',
  'FIRE IN THE HOLE!!!',
  'Attempt 1',
  'GRIEF GOT VERIFIED LETS GOOOOOOOOOO (geometry dash reference)',
  'i saw some green stuff growing on the ground outside yesterday...',
  'im stuck on level 7',
  'why do we exist, anyway?',
  'kalin stop larping',
  'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'Now with extra pepperoni!',
  'Crazy Cattle 3D!',
  'Now Gluten Free!',
  'Out of the ordinary.',
  'Froggit approaches!',
  '(╯°□°）╯︵ ┻━┻',
  'Dance Dance Revolution!! ヘ(￣ω￣ヘ)',
  'snow rider, snow rider.',
  'cat',
  'only on tuesdays!',
  'SPOOKY SCARY SKELETONS!!',
  'wHy dOnT yOu aSk tHe cIrClE bIrDs?',
  'Thats rough buddy',
  '🇺🇸🦅',
  '¯\_(ツ)_/¯',
  'ඞඞඞඞඞඞඞඞඞඞ',
  'AMOGUS!! ඞ',
  'extra fries please.',
  'big mac whopper',
  '-_-  o_o  O_0  \_(0W0)_/  evolution!!',
  'splash text',
  'Muffet Attacks!',
];

const LAST_KEY = 'secretv4-last-splash';

/**
 * Picks one at random, never the same one twice in a row.
 * To preview a specific one, add ?splash=3 to the site's address (3 = the third line in the list).
 */
export function pickSplash(opts: { random?: () => number; search?: string } = {}): string {
  const random = opts.random ?? Math.random;
  const search = opts.search ?? (typeof location !== 'undefined' ? location.search : '');

  const preview = /[?&]splash=(\d+)/.exec(search);
  if (preview) {
    const n = Number(preview[1]);
    if (n >= 1 && n <= SPLASHES.length) return SPLASHES[n - 1];
  }

  let last = '';
  try {
    last = localStorage.getItem(LAST_KEY) ?? '';
  } catch {
    // ignore
  }
  const pool = SPLASHES.filter((s) => s !== last);
  const pick = pool[Math.floor(random() * pool.length)] ?? SPLASHES[0];
  try {
    localStorage.setItem(LAST_KEY, pick);
  } catch {
    // ignore
  }
  return pick;
}
