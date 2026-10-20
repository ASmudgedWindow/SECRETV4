import { getSiteConfig } from '@/lib/siteConfig';
import { voterId } from '@/lib/stats';
import { getProgress } from '@/lib/progress';
import { getPresence } from '@/lib/presence';
import { ACHIEVEMENTS, grantAchievements } from '@/lib/achievements';
import { openRickroll } from '@/components/Rickroll';
import { showRemoteMessage } from '@/components/RemoteMessage';
import { bananaCursor, comic, confetti, countdown, emojiRain, flip, invert, rainbow, shake, stopAllEffects } from '@/lib/trolls';

/**
 * Owner tools. Every 30 seconds by default (only while the tab is visible) this browser tells the counter it is online and which page or game it is on, and picks up any
 * actions the site owner queued. The site only ever runs the fixed actions listed in run() below.
 */
let cursor: number | null = null;
let started = false;
let lastPulse = 0;

function shortBrowser(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /CrOS/.test(ua) ? 'ChromeOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown';
  return `${browser} · ${os}`;
}

export interface RemoteCommand {
  id: number;
  type: string;
  payload?: Record<string, unknown>;
}

/** The complete list of things the owner can make this site do. Anything else is ignored. */
export function run(c: RemoteCommand) {
  switch (c.type) {
    case 'rickroll':
      openRickroll();
      break;
    case 'message': {
      const text = typeof c.payload?.text === 'string' ? c.payload.text.slice(0, 200) : '';
      if (text) showRemoteMessage(text);
      break;
    }
    case 'close_game':
      window.dispatchEvent(new Event('secretv4-close-game'));
      break;
    case 'close_tab':
      window.close(); // only works for tabs the site opened itself (such as the about:blank cloak)
      window.setTimeout(() => window.location.replace('about:blank'), 400);
      break;
    case 'reload':
      window.location.reload();
      break;
    case 'give_all':
      grantAchievements('all');
      break;
    case 'give_one': {
      const id = c.payload?.id;
      if (typeof id === 'string' && ACHIEVEMENTS.some((a) => a.id === id)) grantAchievements([id]);
      break;
    }
    case 'confetti':
      confetti();
      break;
    case 'emoji_rain':
      emojiRain(typeof c.payload?.emoji === 'string' ? c.payload.emoji : '');
      break;
    case 'flip':
      flip();
      break;
    case 'invert':
      invert();
      break;
    case 'rainbow':
      rainbow();
      break;
    case 'shake':
      shake();
      break;
    case 'comic':
      comic();
      break;
    case 'banana':
      bananaCursor();
      break;
    case 'countdown_rickroll':
      countdown(openRickroll);
      break;
    case 'random_game':
      window.dispatchEvent(new Event('secretv4-random-game'));
      break;
    case 'stop_effects':
      stopAllEffects();
      break;
    default:
      break; // unknown: ignore
  }
}

async function pulse() {
  const { statsUrl, ownerTools } = getSiteConfig();
  if (!statsUrl || ownerTools === false || document.visibilityState !== 'visible') return;
  const now = Date.now();
  if (now - lastPulse < 10_000) return;
  lastPulse = now;
  try {
    const p = getProgress();
    const { page, game } = getPresence();
    const res = await fetch(`${statsUrl}/pulse`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        v: voterId(),
        cursor,
        info: { page, game, ua: shortBrowser(), active: Math.round(p.active), ach: Object.keys(p.unlocked).length },
      }),
    });
    const data = (await res.json()) as { ok?: boolean; cursor?: number; commands?: RemoteCommand[] };
    if (!data.ok || typeof data.cursor !== 'number') return;
    cursor = data.cursor;
    for (const c of data.commands ?? []) if (c && typeof c.type === 'string') run(c);
  } catch {
    // offline or the counter is down: try again next time
  }
}

export function startRemote() {
  if (started || typeof window === 'undefined') return;
  started = true;
  void pulse();
  window.setInterval(() => void pulse(), (getSiteConfig().pulseSeconds || 30) * 1000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void pulse());
}
