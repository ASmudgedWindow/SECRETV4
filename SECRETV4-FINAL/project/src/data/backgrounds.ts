import { Sparkles, Snowflake, Lightbulb, Flame, CloudRain, Waves, Grid3x3, Ban, type LucideIcon } from 'lucide-react';
import type { BackgroundId } from '@/lib/backgroundScenes';

export interface BackgroundOption {
  id: BackgroundId;
  name: string;
  description: string;
  icon: LucideIcon;
}

export const backgrounds: BackgroundOption[] = [
  { id: 'stars', name: 'Starfield', description: 'Twinkling stars with the odd glint', icon: Sparkles },
  { id: 'snow', name: 'Snowfall', description: 'Slow, twinkling snow drifting down', icon: Snowflake },
  { id: 'fireflies', name: 'Fireflies', description: 'Soft glowing lights wandering around', icon: Lightbulb },
  { id: 'embers', name: 'Embers', description: 'Warm sparks floating upward', icon: Flame },
  { id: 'rain', name: 'Rain', description: 'Light, slanted rain', icon: CloudRain },
  { id: 'aurora', name: 'Aurora', description: 'Slow glowing color in your theme', icon: Waves },
  { id: 'grid', name: 'Grid', description: 'A faint grid drifting by', icon: Grid3x3 },
  { id: 'none', name: 'Plain', description: 'No background effect', icon: Ban },
];

export const isBackgroundId = (v: unknown): v is BackgroundId => backgrounds.some((b) => b.id === v);
