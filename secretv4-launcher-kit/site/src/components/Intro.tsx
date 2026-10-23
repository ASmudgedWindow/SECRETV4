import { useEffect, useState } from 'react';
import { pickSplash } from '@/lib/splash';

interface IntroProps {
  onComplete: () => void;
}

export function Intro({ onComplete }: IntroProps) {
  const [phase, setPhase] = useState<'fadein' | 'shimmer' | 'fadeout'>('fadein');
  const [splash] = useState(() => pickSplash());

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shimmer'), 600);
    const t2 = setTimeout(() => setPhase('fadeout'), 4200);
    const t3 = setTimeout(onComplete, 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  const opacity = phase === 'fadein' ? 1 : phase === 'fadeout' ? 0 : 1;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black transition-opacity duration-1000"
      style={{ opacity }}
      onClick={onComplete}
    >
      <div className="relative">
        <div
          className="grid-bg absolute inset-0 -z-10"
          style={{ width: '600px', height: '200px', left: '-300px', top: '-100px' }}
        />
        <h1
          data-no-translate
          className="shimmer-text text-6xl md:text-8xl font-bold tracking-[0.15em] select-none"
          style={{
            animation: phase === 'shimmer' ? 'shimmer-sweep 3s ease-in-out, glow-pulse 3s ease-in-out' : 'none',
          }}
        >
          SecretV4
        </h1>
        <div
          className="mt-6 mx-auto h-px transition-all duration-1000"
          style={{
            width: phase === 'fadeout' ? '0%' : '60%',
            background: 'var(--accent)',
            boxShadow: '0 0 8px var(--accent-glow)',
          }}
        />
        <p
          className="mt-4 text-center text-sm tracking-[0.3em] uppercase transition-opacity duration-700"
          style={{
            color: 'var(--text-dim)',
            opacity: phase === 'shimmer' ? 0.6 : 0,
          }}
        >
          Initializing
        </p>
        {/* A random line under the loading text. Clicking or selecting it does not skip the intro. */}
        <style>{`@keyframes v4splash{0%,100%{transform:translateX(-50%) scale(1)}50%{transform:translateX(-50%) scale(1.04)}}@media (prefers-reduced-motion: reduce){.v4splash{animation:none!important}}`}</style>
        <p
          data-no-translate
          className="v4splash absolute text-center text-sm italic select-text transition-opacity duration-1000"
          onClick={(e) => e.stopPropagation()}
          style={{
            left: '50%',
            top: '100%',
            marginTop: 14,
            width: 'min(90vw, 34rem)',
            color: 'var(--accent)',
            textShadow: '0 0 10px var(--accent-glow)',
            opacity: phase === 'shimmer' ? 0.9 : 0,
            transform: 'translateX(-50%)',
            animation: phase === 'shimmer' ? 'v4splash 2.4s ease-in-out infinite' : 'none',
            transitionDelay: phase === 'shimmer' ? '500ms' : '0ms',
          }}
        >
          {splash}
        </p>
      </div>
    </div>
  );
}
