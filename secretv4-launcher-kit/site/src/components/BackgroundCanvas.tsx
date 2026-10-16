import { useEffect, useRef } from 'react';
import { createScene, type BackgroundId, type SceneColors } from '@/lib/backgroundScenes';

interface BackgroundCanvasProps {
  id: BackgroundId;
  colors: SceneColors;
}

/** Full-screen animated background that sits behind everything. */
export function BackgroundCanvas({ id, colors }: BackgroundCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { accent, accentSecondary } = colors;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || id === 'none') return;
    const ctx = canvas.getContext('2d');
    const scene = createScene(id, { accent, accentSecondary });
    if (!ctx || !scene) return;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let last = performance.now();
    let t = 0;

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene.resize(w, h);
      if (reduceMotion) scene.draw(ctx, 0, 0); // one still frame for people who prefer less motion
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      scene.draw(ctx, t, dt);
      raf = requestAnimationFrame(loop);
    };

    fit();
    if (!reduceMotion) raf = requestAnimationFrame(loop);
    window.addEventListener('resize', fit);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
    };
  }, [id, accent, accentSecondary]);

  if (id === 'none') return null;
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: -1 }}
    />
  );
}
