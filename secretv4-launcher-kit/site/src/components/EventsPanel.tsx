import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { libraryGames } from '@/data/gameLibrary';
import { useGameClick } from '@/components/GameLaunchProvider';
import { formatLeft, secondsLeft, useStaff } from '@/lib/staff';

const gameById = new Map(libraryGames.map((g) => [g.id, g]));

const KIND_LABEL: Record<string, string> = {
  game_of_the_hour: 'Game of the Hour',
  featured_collection: 'Featured collection',
  weekend_challenge: 'Weekend challenge',
};

/** Live staff events. `compact` is the one-line version shown above the other Games tabs. */
export function EventsPanel({ compact = false, onOpen }: { compact?: boolean; onOpen?: () => void }) {
  const { events, skew } = useStaff();
  const onGameClick = useGameClick();
  const [, tick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 30000);
    return () => window.clearInterval(t);
  }, []);

  const live = events.filter((e) => secondsLeft(e, skew) > 0);
  if (live.length === 0) return null;

  if (compact) {
    const e = live[0];
    const first = gameById.get(e.games[0]);
    return (
      <button
        onClick={onOpen}
        className="flex-shrink-0 mb-3 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent)', color: 'var(--text)' }}
      >
        <Star size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span className="truncate">
          <b>Live now:</b> {e.title}
          {first && e.kind === 'game_of_the_hour' ? `: ${first.title}` : ''} <span style={{ color: 'var(--text-dim)' }}>({formatLeft(secondsLeft(e, skew))})</span>
        </span>
        <span className="ml-auto flex-shrink-0" style={{ color: 'var(--accent)' }}>
          See Staff Picks
        </span>
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 mb-4 space-y-3">
      {live.map((e) => (
        <div key={e.id} className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent)', boxShadow: '0 0 12px var(--accent-glow)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Star size={16} style={{ color: 'var(--accent)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {e.title}
            </p>
            <span className="text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5" style={{ color: 'var(--accent)', border: '1px solid var(--accent)' }}>
              {KIND_LABEL[e.kind] ?? 'Event'}
            </span>
            <span className="ml-auto text-xs" style={{ color: 'var(--text-dim)' }}>
              {formatLeft(secondsLeft(e, skew))}
            </span>
          </div>
          {e.descr && (
            <p className="text-xs mb-2" style={{ color: 'var(--text-dim)' }}>
              {e.descr}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {e.games.map((id) => {
              const g = gameById.get(id);
              if (!g) return null;
              return (
                <a
                  key={id}
                  href={g.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(ev) => onGameClick(ev, g)}
                  className="rounded-lg px-3 py-1.5 text-xs"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text)' }}
                >
                  {g.title}
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
