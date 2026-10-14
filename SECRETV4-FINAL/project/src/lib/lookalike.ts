/**
 * Letters -> characters that look (almost) the same, mostly from Cyrillic, Greek,
 * Armenian and Cherokee. Edit this table to change any swap. If a swapped letter ever
 * shows up as an empty box on some device, replace it with a safer lookalike here.
 */
const pairs: Record<string, string> = {
  // lowercase
  a: 'а', b: 'ƅ', c: 'с', d: 'ԁ', e: 'е', f: 'ƒ', g: 'ɡ', h: 'һ', i: 'і', j: 'ј',
  k: 'κ', l: 'ӏ', m: 'ⅿ', n: 'ո', o: 'о', p: 'р', q: 'ԛ', r: 'г', s: 'ѕ', t: 'τ',
  u: 'ս', v: 'ν', w: 'ԝ', x: 'х', y: 'у', z: 'ᴢ',
  // uppercase
  A: 'А', B: 'В', C: 'С', D: 'Ꭰ', E: 'Е', F: 'Ϝ', G: 'Ԍ', H: 'Н', I: 'І', J: 'Ј',
  K: 'К', L: 'Ꮮ', M: 'М', N: 'Ν', O: 'О', P: 'Р', Q: 'Ԛ', R: 'Ꮢ', S: 'Ѕ', T: 'Т',
  U: 'Ս', V: 'Ѵ', W: 'Ԝ', X: 'Х', Y: 'Υ', Z: 'Ζ',
};

const reverse: Record<string, string> = {};
for (const [plain, fancy] of Object.entries(pairs)) reverse[fancy] = plain;

const plainLetters = /[A-Za-z]/g;
const fancyLetters = new RegExp(`[${Object.values(pairs).join('')}]`, 'g');

/** Normal letters -> lookalikes. Everything else is left alone. */
export const toLookalike = (text: string) => text.replace(plainLetters, (c) => pairs[c]);

/** Lookalikes -> normal letters. */
export const fromLookalike = (text: string) => fancyLetters.test(text) ? text.replace(fancyLetters, (c) => reverse[c]) : text;
