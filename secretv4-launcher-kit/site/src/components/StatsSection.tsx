import { Trophy, Lock } from 'lucide-react';
import { libraryGames } from '@/data/gameLibrary';
import { usePlays } from '@/lib/plays';
import { useCollections } from '@/lib/collections';
import { totalSeconds, useProgress } from '@/lib/progress';
import { ACHIEVEMENTS, useAchievementContext } from '@/lib/achievements';

const gameById = new Map(libraryGames.map((g) => [g.id, g]));

function formatTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
        {label}
      </p>
      <p className="text-lg font-bold mt-1 truncate" style={{ color: 'var(--accent)' }}>
        {value}
      </p>
    </div>
  );
}

export function StatsSection() {
  const plays = usePlays();
  const collections = useCollections();
  const progress = useProgress();
  const ctx = useAchievementContext();

  const entries = Object.entries(plays.counts).filter(([, n]) => n > 0);
  const totalPlays = entries.reduce((a, [, n]) => a + n, 0);
  const top = entries.sort((a, b) => b[1] - a[1])[0];
  const topGame = top ? gameById.get(Number(top[0])) : undefined;
  const unlockedCount = ACHIEVEMENTS.filter((a) => progress.unlocked[a.id]).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
          Your stats
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Tile label="Games played" value={String(entries.length)} />
          <Tile label="Total plays" value={String(totalPlays)} />
          <Tile label="Time in games" value={formatTime(totalSeconds(progress))} />
          <Tile label="Favorites" value={String(ctx.favorites)} />
          <Tile label="Collections" value={String(collections.length)} />
          <Tile label="Days played" value={String(progress.days.length)} />
          <Tile label="Most played" value={topGame ? `${topGame.title} (${top![1]})` : 'None yet'} />
          <Tile label="Here since" value={new Date(progress.since).toLocaleDateString()} />
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-dim)' }}>
          Kept in this browser only. Time counts while a game is open in the SecretV4 player and the tab is visible. Games
          that open on other sites can't be timed. Everything here is included in Settings, then Save backup.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
          Achievements ({unlockedCount} / {ACHIEVEMENTS.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const done = !!progress.unlocked[a.id];
            const value = Math.min(a.value(ctx), a.target);
            const shown = a.display ? `${a.display(value)} / ${a.display(a.target)}` : `${value} / ${a.target}`;
            return (
              <div
                key={a.id}
                className="rounded-xl border p-4"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: done ? 'var(--accent)' : 'var(--border)',
                  opacity: done ? 1 : 0.8,
                }}
              >
                <div className="flex items-center gap-3">
                  {done ? (
                    <Trophy size={20} style={{ color: 'var(--gold, var(--accent))' }} />
                  ) : (
                    <Lock size={18} style={{ color: 'var(--text-dim)' }} />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {a.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                      {a.description}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(value / a.target) * 100}%`, background: 'var(--accent)' }} />
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
                    {done ? new Date(progress.unlocked[a.id]).toLocaleDateString() : shown}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
