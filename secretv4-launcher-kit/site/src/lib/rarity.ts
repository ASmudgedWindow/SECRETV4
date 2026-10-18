export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'nolife' | 'secret';

export interface RarityStyle {
  label: string;
  /** main color: borders, bars */
  color: string;
  /** brighter shade for text on dark backgrounds */
  text: string;
  /** card background tint */
  bg: string;
  /** higher = rarer */
  order: number;
}

export const RARITIES: Record<Rarity, RarityStyle> = {
  common: { label: 'Common', color: '#8fe388', text: '#8fe388', bg: 'rgba(143, 227, 136, 0.08)', order: 1 },
  rare: { label: 'Rare', color: '#7fc8ff', text: '#7fc8ff', bg: 'rgba(127, 200, 255, 0.09)', order: 2 },
  epic: { label: 'Epic', color: '#ff4d4d', text: '#ff7070', bg: 'rgba(255, 77, 77, 0.1)', order: 3 },
  legendary: { label: 'Legendary', color: '#b266ff', text: '#c690ff', bg: 'rgba(178, 102, 255, 0.11)', order: 4 },
  nolife: { label: 'No-Life', color: '#1e8449', text: '#3fcf7a', bg: 'rgba(30, 132, 73, 0.14)', order: 5 },
  secret: { label: 'SECRET', color: '#6b6b6b', text: '#e6e6e6', bg: '#000000', order: 6 },
};

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'nolife', 'secret'];
