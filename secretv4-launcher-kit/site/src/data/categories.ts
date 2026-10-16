import { libraryGames, type LibraryGame } from './gameLibrary';
import { eaglercraftGames } from './eaglercraft';
export { emulatedSystems } from './extraGames';

const byId = new Map(libraryGames.map((g) => [g.id, g]));

const pick = (ids: number[]): LibraryGame[] =>
  ids.map((id) => byId.get(id)).filter((g): g is LibraryGame => !!g);

/** Game ids come from secretv4_games.json. Edit these lists to change what shows up. */

export const featuredGames = pick([
  2, // A Dark Room
  13, // Amazing Strange Rope Police
  179, // Cookie Clicker
  231, // Doodle Jump
  272, // Eggy Car
]);

export const rageBaitGames = pick([
  494, // Level Devil
  146, // Cat Mario
  345, // Getting Over It
  447, // I Wanna Be the Guy
  589, // Only Up
  454, // Jelly Mario
  471, // Just One Boss
  575, // Obby Only Up
  571, // Obby 99 Will Lose
  83, // Big FLAPPY Tower VS Tiny Square
  84, // Big ICE Tower Tiny Square
  85, // Big NEON Tower Tiny Square
  962, // Unfair Undyne
  632, // Please Don't Touch Anything
  466, // Just Fall LOL
  346, // Get On Top
  309, // Flappy Dunk
  598, 599, 600, // OvO
  944, // Trees Hate You
  823, // Stick With It
  635, // Pogo 3D
  50, // Bad Time Sim
  249, // Drive Mad
  272, // Eggy Car
]);

export const minecraftGames: LibraryGame[] = [
  ...eaglercraftGames,
  ...pick([
  528, // Minecraft Pocket Edition
  526, // Minecraft Case Sim
  527, // Blockcraft Parkour
  529, // Blockcraft Shooter
  274, // Elytra Flight
  377, // Grindcraft
  ]),
];

/** Flash and emulated games come from the link doc; every one is also in All Games. */
export const flashGames: LibraryGame[] = libraryGames.filter((g) => g.kind === 'flash');
export const emulatedGames: LibraryGame[] = libraryGames.filter((g) => g.kind === 'emulated');
