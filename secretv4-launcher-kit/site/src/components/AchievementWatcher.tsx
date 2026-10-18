import { useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { ACHIEVEMENTS, useAchievementContext } from '@/lib/achievements';
import { dismissToast, unlockAchievements, useProgress, useToast } from '@/lib/progress';

/** Always running: unlocks achievements as they are earned and shows a small pop-up */
export function AchievementWatcher() {
  const ctx = useAchievementContext();
  const progress = useProgress();
  const toast = useToast();

  useEffect(() => {
    const earned = ACHIEVEMENTS.filter((a) => !progress.unlocked[a.id] && a.value(ctx) >= a.target);
    if (earned.length === 0) return;
    unlockAchievements(
      earned.map((a) => a.id),
      earned.length === 1 ? `Achievement unlocked: ${earned[0].name}` : `${earned.length} achievements unlocked`,
    );
  }, [ctx, progress.unlocked]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => dismissToast(toast.id), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  if (!toast) return null;
  return (
    <button
      onClick={() => dismissToast(toast.id)}
      className="fixed bottom-4 right-4 z-[9600] flex items-center gap-3 rounded-xl px-4 py-3 text-left animate-slide-up"
      style={{ background: 'var(--panel)', border: '1px solid var(--accent)', boxShadow: '0 0 22px var(--accent-glow)' }}
    >
      <Trophy size={20} style={{ color: 'var(--gold, var(--accent))' }} />
      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
        {toast.text}
      </span>
    </button>
  );
}
