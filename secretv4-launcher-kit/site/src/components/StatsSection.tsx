import { Trophy, Lock, HelpCircle } from 'lucide-react';
import { libraryGames } from '@/data/gameLibrary';
import { usePlays } from '@/lib/plays';
import { useCollections } from '@/lib/collections';
import { streaksOf, totalSeconds, useProgress } from '@/lib/progress';
import { ACHIEVEMENTS, SECTIONS, formatDuration, isDone, useAchievementContext, type Achievement } from '@/lib/achievements';
import { RARITIES, RARITY_ORDER, type Rarity } from '@/lib/rarity';

const gameById = new Map(libraryGames.map((g) => [g.id, g]));

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

function RarityTag({ rarity }: { rarity: Rarity }) {
  const r = RARITIES[rarity];
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 flex-shrink-0"
      style={{ color: r.text, border: `1px solid ${r.color}`, background: rarity === 'secret' ? '#000' : 'transparent' }}
    >
      {r.label}
    </span>
  );
}

function Card({ a, unlockedAt, value, done }: { a: Achievement; unlockedAt?: number; value: number; done: boolean }) {
  const r = RARITIES[a.rarity];
  const shown = a.display ? `${a.display(value)} / ${a.display(a.target)}` : `${Math.floor(value)} / ${a.target}`;
  const showBar = a.rarity !== 'secret';
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        background: done ? r.bg : 'var(--bg-secondary)',
        borderColor: done ? r.color : 'var(--border)',
        boxShadow: done && (a.rarity === 'legendary' || a.rarity === 'nolife' || a.rarity === 'secret') ? `0 0 14px ${r.color}55` : 'none',
        opacity: done ? 1 : 0.75,
      }}
    >
      <div className="flex items-start gap-3">
        {done ? <Trophy size={20} style={{ color: r.text, flexShrink: 0 }} /> : <Lock size={18} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate" style={{ color: done ? '#fff' : 'var(--text)' }}>
              {a.name}
            </p>
            <RarityTag rarity={a.rarity} />
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
            {a.description}
          </p>
        </div>
      </div>
      {showBar && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / a.target) * 100)}%`, background: r.color }} />
          </div>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>
            {done && unlockedAt ? new Date(unlockedAt).toLocaleDateString() : shown}
          </span>
        </div>
      )}
      {!showBar && unlockedAt && (
        <p className="text-[10px] font-mono mt-2" style={{ color: 'var(--text-dim)' }}>
          {new Date(unlockedAt).toLocaleDateString()}
        </p>
      )}
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
  const top = [...entries].sort((a, b) => b[1] - a[1])[0];
  const topGame = top ? gameById.get(Number(top[0])) : undefined;
  const streak = streaksOf(progress.days);

  const doneIds = new Set(ACHIEVEMENTS.filter((a) => progress.unlocked[a.id] || isDone(a, ctx)).map((a) => a.id));
  const perRarity = RARITY_ORDER.map((r) => ({
    rarity: r,
    total: ACHIEVEMENTS.filter((a) => a.rarity === r).length,
    got: ACHIEVEMENTS.filter((a) => a.rarity === r && doneIds.has(a.id)).length,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
          Your stats
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Tile label="Games played" value={String(entries.length)} />
          <Tile label="Total plays" value={String(totalPlays)} />
          <Tile label="Active time" value={formatDuration(progress.active)} />
          <Tile label="Time in games" value={formatDuration(totalSeconds(progress))} />
          <Tile label="Longest session" value={formatDuration(progress.bestSession)} />
          <Tile label="Current streak" value={`${streak.current} ${streak.current === 1 ? 'day' : 'days'}`} />
          <Tile label="Best streak" value={`${Math.max(streak.best, progress.bestStreak)} days`} />
          <Tile label="Favorites" value={String(ctx.favorites)} />
          <Tile label="Collections" value={String(collections.length)} />
          <Tile label="Most played" value={topGame ? `${topGame.title} (${top![1]})` : 'None yet'} />
          <Tile label="Here since" value={new Date(progress.since).toLocaleDateString()} />
        </div>
        <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          Kept in this browser only and included in Settings, then Save backup. Active time only counts while the tab is open
          and you click, type, tap, scroll or use a controller. It pauses after 5 minutes without input, and a game session
          resets after 10 minutes without input. Your total active time never resets. Time inside games can only be seen for
          games hosted on SecretV4.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
          Achievements ({doneIds.size} / {ACHIEVEMENTS.length})
        </h3>
        <div className="flex flex-wrap gap-2">
          {perRarity.map((p) => (
            <span
              key={p.rarity}
              className="text-xs rounded-lg px-2.5 py-1"
              style={{ color: RARITIES[p.rarity].text, border: `1px solid ${RARITIES[p.rarity].color}`, background: p.rarity === 'secret' ? '#000' : 'transparent' }}
            >
              {RARITIES[p.rarity].label} {p.got}/{p.total}
            </span>
          ))}
        </div>
      </div>

      {SECTIONS.map((section) => {
        const list = ACHIEVEMENTS.filter((a) => a.section === section);
        const secret = section === 'Secret';
        const visible = secret ? list.filter((a) => doneIds.has(a.id)) : list;
        const hidden = list.length - visible.length;
        return (
          <div key={section}>
            <h4 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-dim)' }}>
              {section}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visible.map((a) => (
                <Card key={a.id} a={a} unlockedAt={progress.unlocked[a.id]} value={a.value(ctx)} done={doneIds.has(a.id)} />
              ))}
              {secret && hidden > 0 && (
                <div className="rounded-xl border p-4 flex items-center gap-3" style={{ background: '#000', borderColor: '#333' }}>
                  <HelpCircle size={20} style={{ color: '#888' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#ddd' }}>
                      {hidden} hidden {hidden === 1 ? 'achievement' : 'achievements'}
                    </p>
                    <p className="text-xs" style={{ color: '#888' }}>
                      Hidden until you find them. Poke around.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
