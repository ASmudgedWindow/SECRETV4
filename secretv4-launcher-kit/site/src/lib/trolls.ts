/**
 * Harmless, temporary visual gags the site owner can trigger from the dashboard.
 *
 * Every effect undoes itself after a short time, none can trap or block the page, nothing flashes
 * (colour changes are slow and smooth), and anything that moves is skipped for people whose device asks to
 * reduce motion. Nothing here pretends to be a virus, a hack or a system error.
 */
const active = new Map<string, () => void>();

const reduceMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function endEffect(name: string) {
  const undo = active.get(name);
  active.delete(name);
  undo?.();
}

/** Runs an effect for `ms` milliseconds, then undoes it. Starting it again restarts it. */
function begin(name: string, ms: number, apply: () => () => void) {
  endEffect(name);
  const undo = apply();
  const timer = window.setTimeout(() => endEffect(name), ms);
  active.set(name, () => {
    window.clearTimeout(timer);
    undo();
  });
}

export function stopAllEffects() {
  for (const name of [...active.keys()]) endEffect(name);
}

function addStyle(css: string): () => void {
  const s = document.createElement('style');
  s.textContent = css;
  document.head.appendChild(s);
  return () => s.remove();
}

function setStyle(el: HTMLElement | null, props: Record<string, string>): () => void {
  if (!el) return () => {};
  const old: Record<string, string> = {};
  for (const k of Object.keys(props)) {
    old[k] = el.style.getPropertyValue(k);
    el.style.setProperty(k, props[k]);
  }
  return () => {
    for (const k of Object.keys(old)) el.style.setProperty(k, old[k]);
  };
}

/** A fixed layer over the page that never catches clicks */
function layer(): { el: HTMLElement; remove: () => void } {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:9400';
  document.body.appendChild(el);
  return { el, remove: () => el.remove() };
}

const COLORS = ['#ff5c5c', '#ffd24d', '#5cff9d', '#5cc8ff', '#c77dff', '#ff8ad8'];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function confetti() {
  if (reduceMotion()) return;
  begin('confetti', 5000, () => {
    const l = layer();
    const css = addStyle('@keyframes v4fall{from{transform:translateY(-10vh) rotate(0)}to{transform:translateY(110vh) rotate(720deg)}}');
    for (let i = 0; i < 90; i++) {
      const p = document.createElement('span');
      p.style.cssText = `position:absolute;top:0;left:${rand(0, 100)}%;width:${rand(6, 11)}px;height:${rand(8, 16)}px;background:${COLORS[i % COLORS.length]};animation:v4fall ${rand(2.2, 4.4)}s linear ${rand(0, 0.8)}s both`;
      l.el.appendChild(p);
    }
    return () => {
      l.remove();
      css();
    };
  });
}

export function emojiRain(text: string) {
  if (reduceMotion()) return;
  const emoji = Array.from(text || '').slice(0, 4).join('') || '🍕';
  begin('emoji_rain', 11000, () => {
    const l = layer();
    const css = addStyle('@keyframes v4rain{from{transform:translateY(-12vh)}to{transform:translateY(112vh)}}');
    for (let i = 0; i < 45; i++) {
      const p = document.createElement('span');
      p.textContent = emoji;
      p.style.cssText = `position:absolute;top:0;left:${rand(0, 96)}%;font-size:${rand(22, 44)}px;animation:v4rain ${rand(3, 6.5)}s linear ${rand(0, 4)}s both`;
      l.el.appendChild(p);
    }
    return () => {
      l.remove();
      css();
    };
  });
}

/** Whole page upside down (no motion, just a flip) */
export function flip() {
  begin('flip', 15000, () => setStyle(document.documentElement, { transform: 'rotate(180deg)' }));
}

export function invert() {
  begin('invert', 15000, () => addStyle('#root{filter:invert(1) hue-rotate(180deg)}'));
}

/** Slow, smooth colour cycle: a full turn takes 8 seconds, so nothing flashes */
export function rainbow() {
  if (reduceMotion()) return;
  begin('rainbow', 20000, () => addStyle('@keyframes v4hue{to{filter:hue-rotate(360deg)}}#root{animation:v4hue 8s linear infinite}'));
}

/** A gentle 3-second wobble */
export function shake() {
  if (reduceMotion()) return;
  begin(
    'shake',
    3000,
    () =>
      addStyle(
        '@keyframes v4shake{0%,100%{transform:translate(0)}25%{transform:translate(-4px,2px)}50%{transform:translate(3px,-2px)}75%{transform:translate(-3px,-2px)}}#root{animation:v4shake .5s linear infinite}',
      ),
  );
}

export function comic() {
  begin('comic', 30000, () => addStyle('*{font-family:"Comic Sans MS","Comic Sans",cursive !important}'));
}

export function bananaCursor() {
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><text y='26' font-size='26'>🍌</text></svg>";
  begin('banana', 30000, () => addStyle(`*{cursor:url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") 4 4, auto !important}`));
}

/** A big 5-4-3-2-1 in the middle of the screen, then runs `after` */
export function countdown(after: () => void) {
  begin('countdown', 6500, () => {
    const l = layer();
    const num = document.createElement('div');
    num.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:800 min(40vw,320px)/1 system-ui,sans-serif;color:#fff;text-shadow:0 0 30px #000,0 0 8px #000';
    l.el.appendChild(num);
    let n = 5;
    num.textContent = String(n);
    const timer = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(timer);
        l.remove();
        after();
      } else {
        num.textContent = String(n);
      }
    }, 1000);
    return () => {
      window.clearInterval(timer);
      l.remove();
    };
  });
}

/** The whole page does one full turn (about 1.6 seconds) */
export function spinPage() {
  if (reduceMotion()) return;
  begin('spinpage', 1800, () => addStyle('@keyframes v4spinpage{to{transform:rotate(360deg)}}#root{animation:v4spinpage 1.6s ease-in-out 1}'));
}

/** "Grubby" in huge letters, then it spins very fast for about 4 seconds */
export function grubby() {
  begin('grubby', 5000, () => {
    const l = layer();
    const css = addStyle('@keyframes v4grub{to{transform:rotate(360deg)}}');
    const t = document.createElement('div');
    t.textContent = 'Grubby';
    t.style.cssText =
      'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 min(26vw,260px)/1 system-ui,sans-serif;color:#fff;text-shadow:0 0 30px #000,0 0 8px #000;-webkit-text-stroke:2px #000';
    l.el.appendChild(t);
    // Without motion the word just stays put for a few seconds
    const spin = reduceMotion() ? 0 : window.setTimeout(() => (t.style.animation = 'v4grub 0.25s linear infinite'), 1000);
    return () => {
      if (spin) window.clearTimeout(spin);
      l.remove();
      css();
    };
  });
}
