import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Play, Star, Crown, Flame, Box, Gamepad2, Zap, Joystick, Clock } from 'lucide-react';
import { libraryGames, libraryLetters, gameLetter, type LibraryGame } from '@/data/gameLibrary';
import {
  featuredGames,
  rageBaitGames,
  minecraftGames,
  flashGames,
  emulatedGames,
  emulatedSystems,
} from '@/data/categories';
import { useFavorites } from '@/hooks/useFavorites';
import { usePlays } from '@/lib/plays';
import { searchScore } from '@/lib/search';
import { playMode, useManifestVersion } from '@/lib/manifest';
import { useSetting } from '@/hooks/useSettings';
import { useGlobalTop } from '@/lib/stats';
import { useGameClick } from '@/components/GameLaunchProvider';
import { SubTabs, type SubTab } from '@/components/SubTabs';

type CategoryId = 'recent' | 'featured' | 'all' | 'ragebait' | 'minecraft' | 'flash' | 'emulated';

const gameById = new Map(libraryGames.map((g) => [g.id, g]));

const categoryGames: Record<CategoryId, LibraryGame[]> = {
  recent: [],
  featured: featuredGames,
  all: libraryGames,
  ragebait: rageBaitGames,
  minecraft: minecraftGames,
  flash: flashGames,
  emulated: emulatedGames,
};

const tabs: SubTab<CategoryId>[] = [
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'featured', label: 'Featured', icon: Crown, gold: true },
  { id: 'all', label: `All Games (${libraryGames.length})`, icon: Gamepad2 },
  { id: 'ragebait', label: `Ragebait (${rageBaitGames.length})`, icon: Flame },
  { id: 'minecraft', label: `Minecraft (${minecraftGames.length})`, icon: Box },
  { id: 'flash', label: `Flash (${flashGames.length})`, icon: Zap },
  { id: 'emulated', label: `Emulated (${emulatedGames.length})`, icon: Joystick },
];

const PAGE_SIZE = 240;

export function GamesTab() {
  const [category, setCategory] = useState<CategoryId>('featured');
  const [query, setQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [playableOnly, setPlayableOnly] = useState(false);
  const manifestVersion = useManifestVersion();
  const driveOnly = useSetting('driveLinksOnly');
  const [system, setSystem] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { favorites, toggle } = useFavorites();
  const onGameClick = useGameClick();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const plays = usePlays();

  // Games opened most recently, newest first
  const recentGames = useMemo(
    () => plays.recent.map((id) => gameById.get(id)).filter((g): g is LibraryGame => !!g),
    [plays.recent],
  );

  const globalTop = useGlobalTop();

  // Top 10: everyone's most played games when the counter is online, otherwise this device's own.
  // Topped up with the hand-picked favorites when there are fewer than 10.
  const { topGames, topCounts } = useMemo(() => {
    const counts = new Map<number, number>();
    const ranked: LibraryGame[] = [];
    if (globalTop && globalTop.length > 0) {
      for (const e of globalTop) {
        const game = gameById.get(e.id);
        if (game && e.n > 0 && ranked.length < 10) {
          ranked.push(game);
          counts.set(game.id, e.n);
        }
      }
    } else {
      const local = Object.entries(plays.counts)
        .map(([id, n]) => ({ game: gameById.get(Number(id)), n, last: plays.last[id] ?? 0 }))
        .filter((x): x is { game: LibraryGame; n: number; last: number } => !!x.game && x.n > 0)
        .sort((a, b) => b.n - a.n || b.last - a.last)
        .slice(0, 10);
      for (const x of local) {
        ranked.push(x.game);
        counts.set(x.game.id, x.n);
      }
    }
    const taken = new Set(ranked.map((g) => g.id));
    for (const g of featuredGames) {
      if (ranked.length >= 10) break;
      if (!taken.has(g.id)) ranked.push(g);
    }
    return { topGames: ranked, topCounts: counts };
  }, [globalTop, plays.counts, plays.last]);

  const hasPlays = Object.keys(plays.counts).length > 0;
  const isGlobal = !!globalTop && globalTop.length > 0;
  const currentGames = category === 'recent' ? recentGames : category === 'featured' ? topGames : categoryGames[category];

  const isRecent = category === 'recent';
  const isFeatured = category === 'featured';
  const isEmulated = category === 'emulated';

  const switchCategory = (id: CategoryId) => {
    setCategory(id);
    setActiveLetter(null);
    setSystem(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim();
    const out: { game: LibraryGame; score: number }[] = [];
    for (const g of currentGames) {
      const score = q ? searchScore(g, q) : 1;
      if (q && score === 0) continue;
      if (activeLetter && gameLetter(g) !== activeLetter) continue;
      if (onlyFavs && !isFeatured && !isRecent && !favorites.includes(g.id)) continue;
      if (playableOnly && !isFeatured && !isRecent && playMode(g.url, driveOnly) === 'drive') continue;
      if (isEmulated && system && g.system !== system) continue;
      out.push({ game: g, score });
    }
    // Best matches first when searching
    if (q) out.sort((a, b) => b.score - a.score);
    return out.map((x) => x.game);
    // manifestVersion: re-check which games are playable once the manifest has loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGames, query, activeLetter, onlyFavs, favorites, system, isEmulated, isFeatured, isRecent, playableOnly, driveOnly, manifestVersion]);

  // Long lists show a page at a time and load more as you scroll
  useEffect(() => {
    setLimit(PAGE_SIZE);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [category, query, activeLetter, onlyFavs, system, playableOnly]);

  const visible = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setLimit((l) => l + PAGE_SIZE);
      },
      { root: scrollRef.current, rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, limit]);

  const systemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of emulatedGames) if (g.system) counts.set(g.system, (counts.get(g.system) ?? 0) + 1);
    return counts;
  }, []);

  const chip = (active: boolean) => ({
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'var(--bg)' : 'var(--text-dim)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  });

  return (
    <div className="h-full flex flex-col">
      <SubTabs tabs={tabs} active={category} onChange={switchCategory} />

      <div className="flex-shrink-0 mb-4">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: query ? 'var(--accent)' : 'var(--border)',
            boxShadow: query ? `0 0 12px var(--accent-glow)` : 'none',
          }}
        >
          <Search size={18} style={{ color: 'var(--text-dim)' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${currentGames.length} games...`}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            {filtered.length} {filtered.length === 1 ? 'game' : 'games'}
          </span>
        </div>
      </div>

      {isEmulated && (
        <div className="flex-shrink-0 mb-3 flex flex-wrap gap-1">
          <button
            onClick={() => setSystem(null)}
            className="px-2.5 py-1 text-xs rounded-md transition-all"
            style={chip(system === null)}
          >
            All consoles
          </button>
          {emulatedSystems.map((s) => (
            <button
              key={s}
              onClick={() => setSystem(system === s ? null : s)}
              className="px-2.5 py-1 text-xs rounded-md transition-all"
              style={chip(system === s)}
            >
              {s} ({systemCounts.get(s) ?? 0})
            </button>
          ))}
        </div>
      )}

      {!isFeatured && !isRecent && (
        <div className="flex-shrink-0 mb-4 flex flex-wrap gap-1">
          <button
            onClick={() => setActiveLetter(null)}
            className="px-2.5 py-1 text-xs rounded-md transition-all"
            style={chip(activeLetter === null)}
          >
            All
          </button>
          <button
            onClick={() => setOnlyFavs(!onlyFavs)}
            className="px-2.5 py-1 text-xs rounded-md transition-all flex items-center gap-1"
            style={chip(onlyFavs)}
          >
            <Star size={11} fill={onlyFavs ? 'currentColor' : 'none'} />
            Favorites{favorites.length ? ` (${favorites.length})` : ''}
          </button>
          <button
            onClick={() => setPlayableOnly(!playableOnly)}
            className="px-2.5 py-1 text-xs rounded-md transition-all flex items-center gap-1"
            style={chip(playableOnly)}
          >
            <Play size={11} fill={playableOnly ? 'currentColor' : 'none'} />
            Playable only
          </button>
          {libraryLetters
            .filter((l) => currentGames.some((g) => gameLetter(g) === l))
            .map((letter) => (
              <button
                key={letter}
                onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
                className="px-2.5 py-1 text-xs rounded-md transition-all"
                style={chip(activeLetter === letter)}
              >
                {letter}
              </button>
            ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto -mr-2 pr-2">
        {isFeatured && !query && (
          <div className="flex items-center gap-2 mb-3">
            <Crown size={16} style={{ color: 'var(--gold)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--gold)' }}>
              {isGlobal
                ? 'Most played by everyone (topped up with hand-picked favorites)'
                : hasPlays
                  ? 'Your most played (topped up with hand-picked favorites)'
                  : 'Hand-picked favorites'}
            </p>
          </div>
        )}
        {isRecent && !query && recentGames.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} style={{ color: 'var(--accent)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              Recently played
            </p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 h-full">
            <p className="text-sm text-center" style={{ color: 'var(--text-dim)' }}>
              {isRecent && !query
                ? 'Nothing here yet. Games you play on SecretV4 will show up here.'
                : onlyFavs && favorites.length === 0
                  ? 'No favorites yet — tap the star on a game.'
                  : 'No games found.'}
            </p>
          </div>
        ) : (
          <>
            <div
              className={
                isFeatured
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4'
                  : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4'
              }
            >
              {visible.map((game) => {
                const fav = favorites.includes(game.id);
                // Show the platform on cards, except where the tab already makes it obvious
                const mode = playMode(game.url, driveOnly);
                const showTag = !!game.system && category !== 'flash' && !(isEmulated && system);
                return (
                  <div
                    key={game.id}
                    className={`game-card relative rounded-xl border transition-all duration-200 ${
                      isFeatured ? 'gold-card' : ''
                    }`}
                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
                  >
                    <a
                      href={game.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => onGameClick(e, game)}
                      className={`flex items-center justify-between gap-2 pr-12 ${
                        isFeatured ? 'p-6' : 'p-4'
                      }`}
                    >
                      <div className="min-w-0">
                        {isFeatured && (
                          <p
                            className="text-[10px] font-bold tracking-widest mb-1 flex items-center gap-1"
                            style={{ color: 'var(--gold)' }}
                          >
                            <Crown size={10} />{' '}
                            {(topCounts.get(game.id) ?? 0) > 0
                              ? `#${topGames.findIndex((g) => g.id === game.id) + 1} · ${(topCounts.get(game.id) ?? 0).toLocaleString()} ${topCounts.get(game.id) === 1 ? 'PLAY' : 'PLAYS'}`
                              : 'FEATURED'}
                          </p>
                        )}
                        <p
                          className={`font-medium truncate ${isFeatured ? 'text-base' : 'text-sm'}`}
                          style={{ color: 'var(--text)' }}
                        >
                          {game.title}
                        </p>
                        <p className="text-[10px] mt-0.5 tracking-wide flex flex-wrap items-center gap-x-2" style={{ color: 'var(--text-dim)' }}>
                          {showTag && <span>{game.system}</span>}
                          <span style={{ color: mode === 'drive' ? 'var(--text-dim)' : 'var(--accent)' }}>
                            {mode === 'here' ? 'PLAYS HERE' : mode === 'external' ? 'OPENS SITE' : 'DOWNLOAD'}
                          </span>
                        </p>
                      </div>
                      <Play
                        size={isFeatured ? 18 : 14}
                        className="flex-shrink-0"
                        style={{ color: isFeatured ? 'var(--gold)' : 'var(--accent)' }}
                      />
                    </a>
                    <button
                      onClick={() => toggle(game.id)}
                      aria-label={fav ? 'Remove favorite' : 'Add favorite'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                    >
                      <Star
                        size={15}
                        fill={fav ? 'var(--accent)' : 'none'}
                        style={{ color: fav ? 'var(--accent)' : 'var(--text-dim)' }}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center pb-6">
                <button
                  onClick={() => setLimit((l) => l + PAGE_SIZE)}
                  className="px-4 py-2 rounded-lg text-xs"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
                >
                  Show more ({filtered.length - limit} left)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
