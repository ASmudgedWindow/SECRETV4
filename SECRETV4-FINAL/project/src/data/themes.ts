export interface Theme {
  id: string;
  name: string;
  colors: {
    bg: string;
    bgSecondary: string;
    bgTertiary: string;
    panel: string;
    border: string;
    text: string;
    textDim: string;
    accent: string;
    accentGlow: string;
    accentSecondary: string;
  };
}

export const themes: Theme[] = [
  {
    id: 'cyber',
    name: 'Aqua',
    colors: {
      bg: '#0a0e0f',
      bgSecondary: '#0d1416',
      bgTertiary: '#111a1c',
      panel: '#0f1719',
      border: '#1a2e30',
      text: '#d4f4f4',
      textDim: '#5a7a7c',
      accent: '#00fff0',
      accentGlow: 'rgba(0, 255, 240, 0.4)',
      accentSecondary: '#00b8a0',
    },
  },
  {
    id: 'matrix',
    name: 'Emerald',
    colors: {
      bg: '#030a03',
      bgSecondary: '#061206',
      bgTertiary: '#0a1a0a',
      panel: '#071407',
      border: '#1a3a1a',
      text: '#c8ffd0',
      textDim: '#4a7a4a',
      accent: '#00ff44',
      accentGlow: 'rgba(0, 255, 68, 0.4)',
      accentSecondary: '#00aa2a',
    },
  },
  {
    id: 'abyss',
    name: 'Ocean Blue',
    colors: {
      bg: '#050810',
      bgSecondary: '#080d1a',
      bgTertiary: '#0c1226',
      panel: '#0a1020',
      border: '#1a2540',
      text: '#c4d8f0',
      textDim: '#4a6080',
      accent: '#2080ff',
      accentGlow: 'rgba(32, 128, 255, 0.4)',
      accentSecondary: '#1050a0',
    },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    colors: {
      bg: '#0a0405',
      bgSecondary: '#14080a',
      bgTertiary: '#1a0c0e',
      panel: '#100608',
      border: '#2a1216',
      text: '#f0d4d4',
      textDim: '#7a4a4a',
      accent: '#ff3060',
      accentGlow: 'rgba(255, 48, 96, 0.4)',
      accentSecondary: '#a01840',
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    colors: {
      bg: '#0a0703',
      bgSecondary: '#120e06',
      bgTertiary: '#1a1408',
      panel: '#0f0b05',
      border: '#2a2010',
      text: '#f0e0c0',
      textDim: '#7a6a4a',
      accent: '#ffaa20',
      accentGlow: 'rgba(255, 170, 32, 0.4)',
      accentSecondary: '#aa7010',
    },
  },
  {
    id: 'void',
    name: 'Graphite',
    colors: {
      bg: '#080808',
      bgSecondary: '#0e0e0e',
      bgTertiary: '#141414',
      panel: '#0b0b0b',
      border: '#222222',
      text: '#d0d0d0',
      textDim: '#555555',
      accent: '#808080',
      accentGlow: 'rgba(128, 128, 128, 0.3)',
      accentSecondary: '#505050',
    },
  },
  {
    id: 'nebula',
    name: 'Turquoise',
    colors: {
      bg: '#04090a',
      bgSecondary: '#081214',
      bgTertiary: '#0c1a1e',
      panel: '#0a1418',
      border: '#162830',
      text: '#c0e8e8',
      textDim: '#4a6a6e',
      accent: '#20e0c0',
      accentGlow: 'rgba(32, 224, 192, 0.4)',
      accentSecondary: '#109080',
    },
  },
  {
    id: 'plasma',
    name: 'Sunset Orange',
    colors: {
      bg: '#0a0503',
      bgSecondary: '#120a06',
      bgTertiary: '#1a100a',
      panel: '#0f0805',
      border: '#2a1810',
      text: '#f0d8c4',
      textDim: '#7a5a4a',
      accent: '#ff6020',
      accentGlow: 'rgba(255, 96, 32, 0.4)',
      accentSecondary: '#a03810',
    },
  },
];

export const defaultTheme = themes[0];
