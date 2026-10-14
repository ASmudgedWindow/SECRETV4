import { useEffect, useState } from 'react';

interface IntroProps {
  onComplete: () => void;
}

export function Intro({ onComplete }: IntroProps) {
  const [phase, setPhase] = useState<'fadein' | 'shimmer' | 'fadeout'>('fadein');

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
      </div>
    </div>
  );
}
