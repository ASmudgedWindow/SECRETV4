export type BackgroundId = 'stars' | 'snow' | 'fireflies' | 'embers' | 'rain' | 'aurora' | 'grid' | 'none';

export interface SceneColors {
  accent: string;
  accentSecondary: string;
}

export interface Scene {
  /** Called on start and whenever the window size changes (sizes in CSS pixels) */
  resize(w: number, h: number): void;
  /** t = seconds since start, dt = seconds since last frame */
  draw(ctx: CanvasRenderingContext2D, t: number, dt: number): void;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const TAU = Math.PI * 2;

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ---------- Glinting starfield ---------- */

function stars(colors: SceneColors): Scene {
  const [ar, ag, ab] = rgb(colors.accent);
  // Nudge the tinted stars toward white so they stay soft
  const tint: [number, number, number] = [(ar + 255 * 2) / 3, (ag + 255 * 2) / 3, (ab + 255 * 2) / 3].map(Math.round) as [
    number,
    number,
    number,
  ];

  interface Star {
    x: number;
    y: number;
    r: number;
    a: number;
    speed: number;
    phase: number;
    tinted: boolean;
    vx: number;
    vy: number;
    glintAt: number;
    glintLen: number; // 0 = this star never glints
  }

  let W = 0;
  let H = 0;
  let list: Star[] = [];

  const make = (): Star => {
    const r = rand(0.35, 1.5);
    const glinter = Math.random() < 0.12;
    return {
      x: rand(0, W),
      y: rand(0, H),
      r: glinter ? rand(1, 1.7) : r,
      a: rand(0.35, 0.95),
      speed: rand(0.6, 2.6),
      phase: rand(0, TAU),
      tinted: Math.random() < 0.3,
      vx: -rand(0.2, 1.4) * r,
      vy: rand(0.1, 0.8) * r,
      glintAt: rand(0, 10),
      glintLen: glinter ? rand(0.9, 1.6) : 0,
    };
  };

  return {
    resize(w, h) {
      W = w;
      H = h;
      const n = Math.round(clamp((w * h) / 4200, 90, 420));
      list = Array.from({ length: n }, make);
    },
    draw(ctx, t, dt) {
      ctx.clearRect(0, 0, W, H);
      for (const s of list) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.x < -5) s.x = W + 5;
        if (s.y > H + 5) s.y = -5;

        const twinkle = 0.55 + 0.45 * Math.sin(t * s.speed + s.phase);
        const alpha = s.a * twinkle;
        const c = s.tinted ? tint : ([255, 255, 255] as const);
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fill();

        if (s.glintLen > 0) {
          const p = (t - s.glintAt) / s.glintLen;
          if (p > 1) {
            s.glintAt = t + rand(3, 12);
          } else if (p >= 0) {
            const k = Math.sin(p * Math.PI); // 0 -> 1 -> 0
            const len = 4 + 10 * k;
            ctx.strokeStyle = `rgba(255,255,255,${(k * 0.9).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(s.x - len, s.y);
            ctx.lineTo(s.x + len, s.y);
            ctx.moveTo(s.x, s.y - len);
            ctx.lineTo(s.x, s.y + len);
            ctx.stroke();
            ctx.fillStyle = `rgba(255,255,255,${(k * 0.18).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 3 + 3 * k, 0, TAU);
            ctx.fill();
          }
        }
      }
    },
  };
}

/* ---------- Twinkling snow (each flake drifts in its own random direction, always downward) ---------- */

function snow(): Scene {
  interface Flake {
    x: number;
    y: number;
    r: number;
    vx: number;
    vy: number;
    sway: number;
    swayF: number;
    phase: number;
    twF: number;
    twPh: number;
  }

  let W = 0;
  let H = 0;
  let list: Flake[] = [];

  const aim = (f: Flake) => {
    // Slow fall, heading anywhere within about 55 degrees of straight down
    f.vy = rand(14, 34) * (0.6 + (f.r / 3.2) * 0.8);
    const angle = rand(-55, 55) * (Math.PI / 180);
    f.vx = f.vy * Math.tan(angle);
  };

  const make = (anywhere: boolean): Flake => {
    const f: Flake = {
      x: rand(0, W),
      y: anywhere ? rand(0, H) : rand(-30, -5),
      r: rand(0.8, 3.2),
      vx: 0,
      vy: 0,
      sway: rand(2, 9),
      swayF: rand(0.4, 1.2),
      phase: rand(0, TAU),
      twF: rand(0.8, 2.6),
      twPh: rand(0, TAU),
    };
    aim(f);
    return f;
  };

  return {
    resize(w, h) {
      W = w;
      H = h;
      const n = Math.round(clamp((w * h) / 9000, 60, 230));
      list = Array.from({ length: n }, () => make(true));
    },
    draw(ctx, t, dt) {
      ctx.clearRect(0, 0, W, H);
      for (const f of list) {
        f.x += (f.vx + Math.cos(t * f.swayF + f.phase) * f.sway) * dt;
        f.y += f.vy * dt;
        if (f.y > H + 12) {
          const fresh = make(false);
          Object.assign(f, fresh);
        }
        if (f.x < -25) f.x = W + 25;
        if (f.x > W + 25) f.x = -25;

        const twinkle = 0.5 + 0.5 * Math.sin(t * f.twF + f.twPh);
        const alpha = 0.4 + 0.6 * twinkle;
        if (f.r > 2) {
          ctx.fillStyle = `rgba(210,230,255,${(alpha * 0.14).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r * 2.4, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(240,248,255,${(alpha * 0.92).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, TAU);
        ctx.fill();
      }
    },
  };
}

/* ---------- Fireflies ---------- */

function fireflies(colors: SceneColors): Scene {
  const [r, g, b] = rgb(colors.accent);

  interface Fly {
    x: number;
    y: number;
    angle: number;
    speed: number;
    size: number;
    freq: number;
    phase: number;
  }
  let W = 0;
  let H = 0;
  let list: Fly[] = [];

  return {
    resize(w, h) {
      W = w;
      H = h;
      const n = Math.round(clamp((w * h) / 30000, 22, 60));
      list = Array.from({ length: n }, () => ({
        x: rand(0, w),
        y: rand(0, h),
        angle: rand(0, TAU),
        speed: rand(8, 22),
        size: rand(1.2, 2.4),
        freq: rand(0.3, 0.9),
        phase: rand(0, TAU),
      }));
    },
    draw(ctx, t, dt) {
      ctx.clearRect(0, 0, W, H);
      for (const f of list) {
        f.angle += (Math.sin(t * 0.7 + f.phase) * 0.9 + (Math.random() - 0.5) * 1.4) * dt;
        f.x += Math.cos(f.angle) * f.speed * dt;
        f.y += Math.sin(f.angle) * f.speed * dt;
        if (f.x < -20) f.x = W + 20;
        if (f.x > W + 20) f.x = -20;
        if (f.y < -20) f.y = H + 20;
        if (f.y > H + 20) f.y = -20;

        const pulse = Math.max(0, Math.sin(t * f.freq * TAU * 0.5 + f.phase));
        const glow = 0.08 + 0.92 * pulse * pulse;
        const radius = f.size * 9;
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, radius);
        grad.addColorStop(0, `rgba(${r},${g},${b},${(glow * 0.55).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, radius, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${(glow * 0.9).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 0.7, 0, TAU);
        ctx.fill();
      }
    },
  };
}

/* ---------- Rising embers ---------- */

function embers(): Scene {
  interface Ember {
    x: number;
    y: number;
    r: number;
    vy: number;
    sway: number;
    swayF: number;
    phase: number;
    flicker: number;
    green: number;
  }
  let W = 0;
  let H = 0;
  let list: Ember[] = [];

  const make = (anywhere: boolean): Ember => ({
    x: rand(0, W),
    y: anywhere ? rand(0, H) : H + rand(5, 40),
    r: rand(0.7, 2.2),
    vy: rand(18, 55),
    sway: rand(4, 16),
    swayF: rand(0.5, 1.6),
    phase: rand(0, TAU),
    flicker: rand(3, 8),
    green: Math.round(rand(110, 190)),
  });

  return {
    resize(w, h) {
      W = w;
      H = h;
      const n = Math.round(clamp((w * h) / 12000, 50, 140));
      list = Array.from({ length: n }, () => make(true));
    },
    draw(ctx, t, dt) {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        e.y -= e.vy * dt;
        e.x += Math.cos(t * e.swayF + e.phase) * e.sway * dt;
        if (e.y < -10) {
          list[i] = make(false);
          continue;
        }
        const fade = clamp(e.y / (H * 0.85), 0, 1); // fades out toward the top
        const flick = 0.65 + 0.35 * Math.sin(t * e.flicker + e.phase);
        const alpha = fade * flick * 0.9;
        ctx.fillStyle = `rgba(255,${e.green},60,${(alpha * 0.2).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 3, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(255,${e.green + 40},90,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, TAU);
        ctx.fill();
      }
    },
  };
}

/* ---------- Soft rain ---------- */

function rain(): Scene {
  interface Drop {
    x: number;
    y: number;
    len: number;
    speed: number;
    a: number;
  }
  const SLANT = 0.16;
  let W = 0;
  let H = 0;
  let list: Drop[] = [];

  const make = (anywhere: boolean): Drop => ({
    x: rand(-60, W + 60),
    y: anywhere ? rand(0, H) : rand(-80, -10),
    len: rand(9, 22),
    speed: rand(520, 900),
    a: rand(0.1, 0.28),
  });

  return {
    resize(w, h) {
      W = w;
      H = h;
      const n = Math.round(clamp((w * h) / 6500, 80, 260));
      list = Array.from({ length: n }, () => make(true));
    },
    draw(ctx, _t, dt) {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      for (let i = 0; i < list.length; i++) {
        const d = list[i];
        d.y += d.speed * dt;
        d.x += d.speed * SLANT * dt;
        if (d.y > H + 20 || d.x > W + 80) {
          list[i] = make(false);
          continue;
        }
        ctx.strokeStyle = `rgba(175,205,235,${d.a.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * SLANT, d.y - d.len);
        ctx.stroke();
      }
    },
  };
}

/* ---------- Aurora (slow drifting glows in the theme colors) ---------- */

function aurora(colors: SceneColors): Scene {
  const a = rgb(colors.accent);
  const b = rgb(colors.accentSecondary);
  const mix: [number, number, number] = [
    Math.round((a[0] + b[0]) / 2),
    Math.round((a[1] + b[1]) / 2),
    Math.round((a[2] + b[2]) / 2),
  ];
  const blobs = [
    { c: a, fx: 0.07, fy: 0.05, px: 0, py: 1.2, size: 0.55, alpha: 0.16 },
    { c: b, fx: 0.05, fy: 0.08, px: 2.1, py: 0.4, size: 0.6, alpha: 0.18 },
    { c: mix, fx: 0.09, fy: 0.06, px: 4.2, py: 2.6, size: 0.5, alpha: 0.12 },
  ];
  let W = 0;
  let H = 0;

  return {
    resize(w, h) {
      W = w;
      H = h;
    },
    draw(ctx, t) {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const big = Math.max(W, H);
      for (const blob of blobs) {
        const x = W * (0.5 + 0.38 * Math.sin(t * blob.fx + blob.px));
        const y = H * (0.45 + 0.32 * Math.cos(t * blob.fy + blob.py));
        const radius = big * blob.size;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(${blob.c[0]},${blob.c[1]},${blob.c[2]},${blob.alpha})`);
        grad.addColorStop(1, `rgba(${blob.c[0]},${blob.c[1]},${blob.c[2]},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  };
}

/* ---------- Drifting grid ---------- */

function grid(colors: SceneColors): Scene {
  const [r, g, b] = rgb(colors.accent);
  const STEP = 56;
  let W = 0;
  let H = 0;

  return {
    resize(w, h) {
      W = w;
      H = h;
    },
    draw(ctx, t) {
      ctx.clearRect(0, 0, W, H);
      const off = (t * 7) % STEP;
      ctx.strokeStyle = `rgba(${r},${g},${b},0.075)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -off; x < W + STEP; x += STEP) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, H);
      }
      for (let y = -off; y < H + STEP; y += STEP) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(W, Math.round(y) + 0.5);
      }
      ctx.stroke();
    },
  };
}

export function createScene(id: BackgroundId, colors: SceneColors): Scene | null {
  switch (id) {
    case 'stars':
      return stars(colors);
    case 'snow':
      return snow();
    case 'fireflies':
      return fireflies(colors);
    case 'embers':
      return embers();
    case 'rain':
      return rain();
    case 'aurora':
      return aurora(colors);
    case 'grid':
      return grid(colors);
    default:
      return null;
  }
}
