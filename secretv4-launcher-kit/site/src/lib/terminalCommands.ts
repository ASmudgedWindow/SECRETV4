/**
 * The terminal's commands. Typing is not case sensitive, and a few commands have more than one word
 * (like "drive mad"). A command with a `help` entry is listed by `help`. The others are secret: they only
 * appear in `help` after you have found them by running them once.
 *
 * This file has no React in it. Everything it does to the page goes through the `TerminalApi` it is given.
 */
import type { LibraryGame } from '@/data/gameLibrary';
import type { GamesRequest, NavTab } from '@/lib/nav';

export type LineKind = 'out' | 'dim' | 'error' | 'cmd' | 'big';

export interface TerminalApi {
  print(text: string, kind?: LineKind, onClick?: () => void): void;
  /** Types text one letter at a time. `pauseAfter` is a piece of the text to stop for a moment after. */
  typewriter(text: string, opts?: { pauseAfter?: string }): Promise<void>;
  clear(): void;
  gotoTab(tab: NavTab, games?: GamesRequest): void;
  findGames(query: string, max: number): LibraryGame[];
  findGameByTitle(title: string): LibraryGame | undefined;
  openGame(game: LibraryGame): void;
  recentGames(): LibraryGame[];
  /** Changes the site theme and returns its name */
  setTheme(themeId: string): string;
  whoami(): string[];
  now(): Date;
  random(): number;
  isAdmin(): boolean;
  unlock(id: string): void;
  unlocked(): string[];
  effects: {
    rickroll(): void;
    toggleMatrix(): boolean;
    grubby(): void;
    rainbow(): void;
    spin(): void;
    smile(): void;
    draw(): void;
    spam(): void;
    exit(): void;
  };
}

export interface Command {
  id: string;
  /** Everything it can be typed as, in lower case */
  names: string[];
  /** If present, the command is listed by `help` */
  help?: { usage: string; text: string };
  run(args: string, api: TerminalApi): void | Promise<void>;
}

/** Which theme each colour word switches to ("whatever is closest") */
export const COLOR_THEMES: Record<string, { theme: string; label: string }> = {
  red: { theme: 'crimson', label: 'red' },
  orange: { theme: 'plasma', label: 'orange' },
  yellow: { theme: 'amber', label: 'yellow' },
  green: { theme: 'matrix', label: 'green' },
  blue: { theme: 'abyss', label: 'blue' },
  purple: { theme: 'abyss', label: 'purple' },
  pink: { theme: 'crimson', label: 'pink' },
  grey: { theme: 'void', label: 'grey' },
  gray: { theme: 'void', label: 'grey' },
};

export const BINARY_CLUE =
  '01010111 01101111 01110111 00100000 01111001 01101111 01110101 00100000 01100001 01100011 01110100 01110101 01100001 01101100 01101100 01111001 00100000 01100100 01100101 01100011 01101111 01100100 01100101 01100100 00100000 01110100 01101000 01101001 01110011 00100001 00100001 00100000 01001001 00100111 01101101 00100000 01101001 01101101 01110000 01110010 01100101 01110011 01110011 01100101 01100100 00100000 01101110 01100111 01101100 00101110 00100000 01001000 01100101 01110010 01100101 00100111 01110011 00100000 01110100 01101000 01100101 00100000 01101110 01100101 01111000 01110100 00100000 01100011 01101100 01110101 01100101 00111010 00100000 01101000 01110100 01110100 01110000 01110011 00111010 00101111 00101111 01100100 01101111 01100011 01110011 00101110 01100111 01101111 01101111 01100111 01101100 01100101 00101110 01100011 01101111 01101101 00101111 01100100 01101111 01100011 01110101 01101101 01100101 01101110 01110100 00101111 01100100 00101111 00110001 01101001 01101000 01101000 01001101 01101111 01011010 01101101 01110001 01110000 01001110 01100101 01100100 01000100 01100011 01001111 00111000 00110101 00101101 01110110 01000001 01010101 01000010 01100011 01000111 01101101 01001111 00111000 01101110 01110000 01001111 01000110 01111010 00110000 01001110 01011111 01101100 01001011 01000110 01101011 01000100 01001110 01000110 01000101 00101111 01100101 01100100 01101001 01110100 00111111 01110101 01110011 01110000 00111101 01110011 01101000 01100001 01110010 01101001 01101110 01100111';

const FILE_POOL = [
  'homework_final_FINAL(2).docx', 'definitely_not_games/', 'cat.png', 'node_modules/', 'TODO.txt', 'secret_plans.txt', 'untitled(14).png',
  'chicken_jockey.mp4', 'math_notes.pdf', 'do_not_open/', 'minecraft_world_backup.zip', 'grubby.exe', 'resume_v7.pdf', 'new_folder/',
  'new_folder(2)/', 'bruh.gif', 'not_passwords.txt', 'essay_draft.docx', 'meme_collection/', 'audio_final_v3.wav', 'spreadsheet.xlsx',
  'important.txt', 'stuff/', 'more_stuff/', 'even_more_stuff/', 'lol.jpg', 'config.sys', 'readme_first.txt', 'cheese.dat', 'spine.bin',
  'soybeans.csv', 'empty_file', 'a.out', 'image(1).jpg', 'project/', 'old/', 'new/', 'backup/', 'soybean_report.pdf', 'copper_stairs.obj',
];

const say = (text: string, kind: LineKind = 'out') => (_: string, api: TerminalApi) => api.print(text, kind);

function colorCommand(word: string): Command {
  return {
    id: word,
    names: word === 'grey' ? ['grey', 'gray'] : [word],
    run: (_a, api) => {
      const c = COLOR_THEMES[word];
      api.print(`Theme set to ${api.setTheme(c.theme)} (closest to ${c.label}).`);
    },
  };
}

export const COMMANDS: Command[] = [
  // ---- listed by help ----
  {
    id: 'help',
    names: ['help'],
    help: { usage: 'help', text: 'List the commands' },
    run: (_a, api) => {
      const listed = COMMANDS.filter((c) => c.help);
      const width = Math.max(...listed.map((c) => c.help!.usage.length)) + 3;
      api.print('Commands:', 'dim');
      for (const c of listed) api.print('  ' + c.help!.usage.padEnd(width) + c.help!.text);
      const found = COMMANDS.filter((c) => !c.help && api.unlocked().includes(c.id));
      if (found.length) {
        api.print('');
        api.print('Secret commands you have found:', 'dim');
        api.print('  ' + found.map((c) => c.names[0]).join(', '));
      }
    },
  },
  {
    id: 'games',
    names: ['games'],
    help: { usage: 'games [game]', text: 'Go to the Games tab, or open a game by name' },
    run: (args, api) => {
      const q = args.trim();
      if (!q) {
        api.print('Opening the Games tab...', 'dim');
        api.gotoTab('games', { category: 'all' });
        return;
      }
      const found = api.findGames(q, 4);
      if (!found.length) return api.print(`No game found for "${q}".`, 'error');
      api.print(`Opening ${found[0].title}...`);
      if (found.length > 1) api.print('Other matches: ' + found.slice(1).map((g) => g.title).join(', '), 'dim');
      api.openGame(found[0]);
    },
  },
  { id: 'tools', names: ['tools'], help: { usage: 'tools', text: 'Go to the Tools tab' }, run: (_a, api) => api.gotoTab('tools') },
  { id: 'stuff', names: ['stuff'], help: { usage: 'stuff', text: 'Go to the Stuff tab' }, run: (_a, api) => api.gotoTab('stuff') },
  { id: 'settings', names: ['settings'], help: { usage: 'settings', text: 'Go to Settings' }, run: (_a, api) => api.gotoTab('settings') },
  {
    id: 'search',
    names: ['search'],
    help: { usage: 'search [query]', text: 'Search the games' },
    run: (args, api) => {
      const q = args.trim();
      if (!q) {
        api.print('Taking you to the search box...', 'dim');
        api.gotoTab('games', { category: 'all', query: '', focus: true });
        return;
      }
      const found = api.findGames(q, 11);
      if (!found.length) return api.print(`No games found for "${q}".`, 'error');
      found.slice(0, 10).forEach((g, i) => api.print(`  ${String(i + 1).padStart(2)}. ${g.title}`, 'out', () => api.openGame(g)));
      api.print(found.length > 10 ? 'Showing the first 10. Click one to open it.' : 'Click a result to open it.', 'dim');
    },
  },
  {
    id: 'recent',
    names: ['recent'],
    help: { usage: 'recent', text: 'Show the games you played recently' },
    run: (_a, api) => {
      const list = api.recentGames().slice(0, 10);
      if (!list.length) return api.print('No recent games yet. Go play something!', 'dim');
      list.forEach((g, i) => api.print(`  ${String(i + 1).padStart(2)}. ${g.title}`, 'out', () => api.openGame(g)));
      api.print('Click one to play it again.', 'dim');
    },
  },
  { id: 'clear', names: ['clear'], help: { usage: 'clear', text: 'Clear the terminal' }, run: (_a, api) => api.clear() },
  {
    id: 'whoami',
    names: ['whoami'],
    help: { usage: 'whoami', text: 'Show info about you' },
    run: (_a, api) => api.whoami().forEach((l) => api.print(l)),
  },
  { id: 'date', names: ['date'], help: { usage: 'date', text: 'Show the date and time' }, run: (_a, api) => api.print(api.now().toString()) },
  { id: 'draw', names: ['draw'], help: { usage: 'draw', text: 'A very simple drawing pad' }, run: (_a, api) => api.effects.draw() },
  { id: 'hi', names: ['hi'], help: { usage: 'hi', text: 'Say hi' }, run: say('uhh... Hi.') },
  { id: '???', names: ['???'], help: { usage: '???', text: '???' }, run: (_a, api) => api.print(BINARY_CLUE) },

  // ---- secret: only listed by help once you have run them ----
  { id: 'rickroll', names: ['rickroll'], run: (_a, api) => api.effects.rickroll() },
  {
    id: 'matrix',
    names: ['matrix'],
    run: (_a, api) => api.print(api.effects.toggleMatrix() ? 'Wake up, Neo... (type matrix again to turn it off)' : 'Matrix mode off.'),
  },
  { id: 'drivemad', names: ['drive mad'], run: say('Drive mad, Drive mad.') },
  { id: 'sudo', names: ['sudo'], run: (_a, api) => api.print(api.isAdmin() ? 'You are an admin I know, but this still does nothing XD' : "You're not an admin XD") },
  ...['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'grey'].map(colorCommand),
  { id: 'farts', names: ['farts'], run: say('🤢🤮') },
  { id: 'grubby', names: ['grubby'], run: (_a, api) => api.effects.grubby() },
  {
    id: 'rainbow',
    names: ['rainbow', 'rainbow mode'],
    run: (_a, api) => {
      api.effects.rainbow();
      api.print('Taste the rainbow. (20 seconds)', 'dim');
    },
  },
  { id: 'spin', names: ['spin'], run: (_a, api) => api.effects.spin() },
  { id: 'flowey', names: ['flowey'], run: (_a, api) => api.typewriter("In this world... It's kill or be killed", { pauseAfter: '...' }) },
  { id: 'what', names: ['what'], run: say('What did you expect?') },
  { id: 'why', names: ['why'], run: say('Good question') },
  { id: 'smile', names: [':)'], run: (_a, api) => api.effects.smile() },
  { id: 'dots', names: ['...'], run: say('... hi ...') },
  { id: 'chicken', names: ['chicken'], run: say('CHICKEN JOCKEY!!') },
  { id: 'ugly', names: ['you are ugly'], run: say('You are literally talking to a terminal') },
  { id: 'secret', names: ['secret'], run: say('you found a secret!! absolutely nothing!!') },
  { id: 'sunflower', names: ['sunflower'], run: (_a, api) => { api.print("If you somehow knew this was a youtube url. Wow. If you searched it into google, not as tuff but still good for you."); api.print("Next Clue: https://moldy.app/ + sunflower + u9wmf2bQONtditeRE+Srb5agUbgPR/7FJ0oaCkmyG3JtgPawpi+jwwWa0bx38mLLArToZj7ihcKNvtFpn5m6em9eB0ThlIn33JQpfIRtVIGeHtfMJ5Vnk5CUbNvhLkbSZsEp7aLeR1+Dw5tsr+xI46V3YG6woXe2Cn83aX/NHUX5X54nD+PWQXh+7Z+p0SikYHR2wdBMrdUQpUpngMdnkEzASyKMpaLQkNQjAccoz6VWk3Tto3tnm2tC3LgCruGhH44teQsqlHFJEDVZcg=="); } },
  { id: 'maggot', names: ['maggot'], run: (_a, api) => { api.print("I don't know if that one was really easy or really hard. Either way, nice job, you won!"); grantAchievements(['cryptographer']); } },
  {
    id: 'cattle',
    names: ['crazy cattle 3d'],
    run: (_a, api) => {
      api.print('wow that game is so peak');
      const g = api.findGameByTitle('Crazy Cattle 3D');
      if (g) api.openGame(g);
      else api.print("(that game isn't in the library right now)", 'dim');
    },
  },
  { id: 'roblox', names: ['roblox'], run: say('Seriously?') },
  { id: 'how', names: ['how'], run: say('this is how: ') },
  { id: 'filename', names: ['filename'], run: say('18g46df3wKwA4aAC-z9rnYR6FclyXNow620C10gstIac  -  good luck  -  this is a hard one.') },
  {
    id: 'spam',
    names: ['spam'],
    run: (_a, api) => {
      api.print('You asked for it...');
      api.effects.spam();
    },
  },
  { id: 'wasd', names: ['wasd'], run: say('wut') },
  {
    id: 'ls',
    names: ['ls'],
    run: (_a, api) => {
      const pool = [...FILE_POOL];
      const count = 7 + Math.floor(api.random() * 6);
      const picked: string[] = [];
      while (picked.length < count && pool.length) picked.push(pool.splice(Math.floor(api.random() * pool.length), 1)[0]);
      api.print(picked.join('   '));
    },
  },
  {
    id: 'exit',
    names: ['exit'],
    run: (_a, api) => {
      api.print('Goodbye.', 'dim');
      api.effects.exit();
    },
  },
  { id: 'password', names: ['password'], run: say('Nice try') },
];

const BY_NAME = new Map<string, Command>();
for (const c of COMMANDS) for (const n of c.names) BY_NAME.set(n, c);

/** Names offered by tab-completion: the listed commands plus the secrets already found */
export function completions(prefix: string, unlockedIds: string[]): string[] {
  const p = prefix.toLowerCase();
  return COMMANDS.filter((c) => c.help || unlockedIds.includes(c.id))
    .flatMap((c) => c.names)
    .filter((n) => n.startsWith(p) && n !== '???');
}

/**
 * Runs what was typed. Not case sensitive. The longest command name that matches the start of the line wins,
 * and whatever is left over is the argument ("games Slope" -> command "games", argument "Slope").
 */
export async function execute(raw: string, api: TerminalApi): Promise<void> {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return;
  for (let k = tokens.length; k >= 1; k--) {
    const cmd = BY_NAME.get(tokens.slice(0, k).join(' ').toLowerCase());
    if (cmd) {
      if (!cmd.help) api.unlock(cmd.id);
      await cmd.run(tokens.slice(k).join(' '), api);
      return;
    }
  }
  api.print(`command not found: ${tokens[0]}. Type 'help' for a list of commands.`, 'error');
}
