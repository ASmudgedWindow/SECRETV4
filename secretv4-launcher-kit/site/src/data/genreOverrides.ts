import type { GenreId } from './genres';

/**
 * Fix a game's genres here. A line REPLACES the automatic genres for that game.
 * Use the game's number (id) and any of these genres:
 *   'two-player' 'platformer' 'arcade' 'simulator' 'idle' 'shooter' 'puzzle' 'racing' 'sports'
 *   'rpg' 'fighting' 'horror' 'strategy' 'sandbox' 'adventure' 'board' 'io' 'rhythm'
 * Use an empty list [] to remove a game from every genre.
 *
 * Example:
 *   14: ['platformer', 'two-player'],
 */
export const genreOverrides: Record<number, GenreId[]> = {
};
