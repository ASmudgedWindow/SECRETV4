import { useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { ACHIEVEMENTS, isDone, useAchievementContext } from '@/lib/achievements';
import { startActivityTracking } from '@/lib/activity';
import { startRemote } from '@/lib/remote';
import { dismissToast, unlockAchievements, useProgress, useToasts, type Toast } from '@/lib/progress';
import { RARITIES } from '@/lib/rarity';

/** Always running: tracks activity, unlocks achievements and shows the corner pop-ups */
export function AchievementWatcher() {
  const ctx = useAchievementContext();
  const progress = useProgress();
  const toasts = useToasts();

  useEffect(() => {
    startActivityTracking();
    startRemote();
  }, []);

  useEffect(() => {
    const earned = ACHIEVEMENTS.filter((a) => !progress.unlocked[a.id] && isDone(a, ctx));
    if (earned.length === 0) return;
    unlockAchievements(
      earned.map((a) => ({ id: a.id, name: a.name, description: a.description, rarity: a.rarity })),
      (r) => RARITIES[r].order,
    );
  }, [ctx, progress.unlocked]);

  if (toasts.length === 0) return null;
  return (
    <div className="ach fixed bottom-4 right-4 z-[9600] flex flex-col gap-3 items-end pointer-events-none" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
      <style>{CSS}</style>
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}

const DURATION: Record<string, number> = { common: 5000, rare: 6000, epic: 7000, legendary: 9000, nolife: 10000, secret: 9000 };

function ToastCard({ toast }: { toast: Toast }) {
  const rarity = toast.rarity ?? 'common';
  const style = RARITIES[rarity];

  useEffect(() => {
    const t = window.setTimeout(() => dismissToast(toast.id), DURATION[rarity]);
    return () => window.clearTimeout(t);
  }, [toast.id, rarity]);

  const isSecret = rarity === 'secret';
  const label = toast.rarity ? `${style.label} achievement` : 'Achievements';

  return (
    <>
      {/* Screen-wide flash for the two rarest tiers */}
      {(rarity === 'nolife' || isSecret) && (
        <div className={`ach-flash ${rarity}`} style={{ background: isSecret ? 'radial-gradient(circle, rgba(255,255,255,0.28), rgba(0,0,0,0) 70%)' : 'radial-gradient(circle, rgba(46,204,113,0.32), rgba(0,0,0,0) 70%)' }} />
      )}
      <button
        onClick={() => dismissToast(toast.id)}
        className={`ach-card ${rarity} pointer-events-auto relative text-left rounded-xl overflow-hidden`}
        style={{ ['--c' as string]: style.color, ['--t' as string]: style.text, minWidth: 260, maxWidth: 340 }}
      >
        {/* Legendary: animated gradient frame */}
        {rarity === 'legendary' && <span className="ach-frame" />}
        <span className="ach-inner relative flex items-center gap-3 rounded-[10px] px-4 py-3" style={{ background: isSecret ? '#000' : 'var(--panel)' }}>
          {rarity === 'epic' && <span className="ach-shimmer" />}
          {rarity === 'nolife' && <span className="ach-scan" />}
          {rarity === 'legendary' &&
            [8, 24, 42, 60, 78, 92].map((left, i) => (
              <span key={left} className="ach-spark" style={{ left: `${left}%`, animationDelay: `${i * 0.35}s` }} />
            ))}
          <Trophy size={isSecret || rarity === 'nolife' || rarity === 'legendary' ? 26 : 22} style={{ color: style.text, flexShrink: 0 }} className={rarity === 'nolife' ? 'ach-flicker' : ''} />
          <span className="min-w-0">
            <span className={`block text-[10px] font-bold uppercase tracking-[0.18em] ${rarity === 'nolife' ? 'ach-flicker' : ''}`} style={{ color: style.text }}>
              {label}
            </span>
            <span className={`block text-sm font-semibold ${isSecret ? 'ach-glitch' : ''}`} style={{ color: '#fff' }}>
              {toast.title}
            </span>
            <span className="block text-xs" style={{ color: isSecret ? '#aaa' : 'var(--text-dim)' }}>
              {toast.description}
            </span>
          </span>
        </span>
      </button>
    </>
  );
}

const CSS = `
.ach-card { animation: ach-in 0.45s cubic-bezier(.2,.9,.3,1.2) both; border: 1px solid var(--c); box-shadow: 0 0 10px color-mix(in srgb, var(--c) 45%, transparent); }
.ach-card.rare { animation: ach-in 0.45s cubic-bezier(.2,.9,.3,1.2) both, ach-glow 1.6s ease-in-out 3; }
.ach-card.epic { border-width: 2px; animation: ach-in 0.45s cubic-bezier(.2,.9,.3,1.2) both, ach-glow 1.4s ease-in-out infinite; }
.ach-card.legendary { border: none; padding: 2px; animation: ach-in 0.5s cubic-bezier(.2,.9,.3,1.2) both, ach-glow 1.8s ease-in-out infinite; }
.ach-card.nolife { border-width: 2px; animation: ach-in 0.5s cubic-bezier(.2,.9,.3,1.2) both, ach-glow 1.2s ease-in-out infinite, ach-shake 0.5s ease-in-out 0.35s 1; }
.ach-card.secret { border: 1px solid #8a8a8a; box-shadow: 0 0 18px rgba(255,255,255,0.18); animation: ach-in 0.5s cubic-bezier(.2,.9,.3,1.2) both; }
.ach-frame { position: absolute; inset: 0; border-radius: 12px; background: linear-gradient(110deg, #b266ff, #ff66d6, #66d9ff, #b266ff); background-size: 300% 100%; animation: ach-border 2.5s linear infinite; }
.ach-shimmer { position: absolute; top: 0; bottom: 0; width: 40%; left: 0; background: linear-gradient(100deg, transparent, rgba(255,120,120,0.35), transparent); animation: ach-sweep 1.8s ease-in-out infinite; }
.ach-scan { position: absolute; left: 0; right: 0; height: 2px; background: rgba(63,207,122,0.7); box-shadow: 0 0 8px rgba(63,207,122,0.9); animation: ach-scan 1.6s linear infinite; }
.ach-spark { position: absolute; bottom: 6px; width: 4px; height: 4px; border-radius: 50%; background: #e6ccff; box-shadow: 0 0 6px #b266ff; animation: ach-spark 2s ease-out infinite; }
.ach-flicker { animation: ach-flicker 1.4s steps(1) infinite; }
.ach-glitch { animation: ach-glitch 0.9s steps(2) infinite; text-shadow: 1px 0 #ff2d55, -1px 0 #00e5ff; }
.ach-flash { position: fixed; inset: 0; pointer-events: none; z-index: 9590; animation: ach-flash 1.2s ease-out both; }
@keyframes ach-in { from { transform: translateX(120%); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes ach-glow { 0%, 100% { box-shadow: 0 0 8px color-mix(in srgb, var(--c) 40%, transparent); } 50% { box-shadow: 0 0 26px color-mix(in srgb, var(--c) 85%, transparent); } }
@keyframes ach-border { to { background-position: 300% 0; } }
@keyframes ach-sweep { from { transform: translateX(-120%); } to { transform: translateX(320%); } }
@keyframes ach-scan { from { top: -4px; } to { top: 100%; } }
@keyframes ach-spark { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-46px) scale(0); opacity: 0; } }
@keyframes ach-flicker { 0%, 100% { opacity: 1; } 45% { opacity: 0.45; } 55% { opacity: 1; } 75% { opacity: 0.7; } }
@keyframes ach-glitch { 0%, 100% { transform: translate(0); } 25% { transform: translate(-2px, 1px); } 50% { transform: translate(2px, -1px); } 75% { transform: translate(-1px, -1px); } }
@keyframes ach-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(3px); } }
@keyframes ach-flash { from { opacity: 1; } to { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .ach-card, .ach-frame, .ach-shimmer, .ach-scan, .ach-spark, .ach-flicker, .ach-glitch { animation: none !important; }
  .ach-flash { display: none; }
}
`;
