/**
 * Settings you can change without rebuilding the site, read from site-config.js in the repo root.
 * Anything left empty simply hides the matching button.
 */
export interface Mirror {
  name: string;
  url: string;
}

export interface SiteConfig {
  /** Where "Report broken game" goes: a Google Form link or mailto:you@example.com */
  reportUrl: string;
  /** Address of the play counter (Cloudflare Worker). Empty = each device keeps its own top games */
  statsUrl: string;
  /** Other addresses of the site, shown in Stuff > About */
  mirrors: Mirror[];
  /** Set to false to turn the owner dashboard check-ins off completely */
  ownerTools: boolean;
  /** How often (in seconds) an open tab checks in for the owner dashboard */
  pulseSeconds: number;
}

function cleanUrl(v: unknown, allowMail: boolean): string {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (allowMail && /^mailto:/i.test(s)) return s;
  return '';
}

let cached: SiteConfig | null = null;

export function getSiteConfig(): SiteConfig {
  if (cached) return cached;
  const raw = ((window as unknown as { SECRETV4_SITE?: Record<string, unknown> }).SECRETV4_SITE ?? {}) as Record<string, unknown>;
  const mirrors: Mirror[] = [];
  if (Array.isArray(raw.mirrors)) {
    for (const m of raw.mirrors as unknown[]) {
      const item = (m ?? {}) as Record<string, unknown>;
      const url = cleanUrl(item.url, false);
      if (url) mirrors.push({ name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : url, url });
    }
  }
  cached = { reportUrl: cleanUrl(raw.reportUrl, true), statsUrl: cleanUrl(raw.statsUrl, false).replace(/\/+$/, ''),
    mirrors,
    ownerTools: raw.ownerTools !== false,
    pulseSeconds: Math.max(15, Math.min(600, Number(raw.pulseSeconds) || 30)),
  };
  return cached;
}

/** Opens a form/web link in a new tab, or starts an email with the subject and message filled in */
export function openLink(url: string, subject = '', body = '') {
  if (/^mailto:/i.test(url)) {
    const sep = url.includes('?') ? '&' : '?';
    window.location.href = `${url}${sep}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
