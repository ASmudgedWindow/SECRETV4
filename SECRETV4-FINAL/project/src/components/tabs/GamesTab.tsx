import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Play, Star, Crown, Flame, Box, Gamepad2, Zap, Joystick } from 'lucide-react';
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
import { useGameClick } from '@/components/GameLaunchProvider';
import { SubTabs, type SubTab } from '@/components/SubTabs';

type CategoryId = 'featured' | 'all' | 'ragebait' | 'minecraft' | 'flash' | 'emulated';

const categoryGames: Record<CategoryId, LibraryGame[]> = {
  featured: featuredGames,
  all: libraryGames,
  ragebait: rageBaitGames,
  minecraft: minecraftGames,
  flash: flashGames,
  emulated: emulatedGames,
};

const tabs: SubTab<CategoryId>[] = [
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
  const [system, setSystem] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { favorites, toggle } = useFavorites();
  const onGameClick = useGameClick();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const isFeatured = category === 'featured';
  const isEmulated = category === 'emulated';

  const switchCategory = (id: CategoryId) => {
    setCategory(id);
    setActiveLetter(null);
    setSystem(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categoryGames[category].filter((g) => {
      if (q && !g.title.toLowerCase().includes(q) && !(g.system ?? '').toLowerCase().includes(q)) return false;
      if (activeLetter && gameLetter(g) !== activeLetter) return false;
      if (onlyFavs && !favorites.includes(g.id)) return false;
      if (isEmulated && system && g.system !== system) return false;
      return true;
    });
  }, [category, query, activeLetter, onlyFavs, favorites, system, isEmulated]);

  // Long lists show a page at a time and load more as you scroll
  useEffect(() => {
    setLimit(PAGE_SIZE);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [category, query, activeLetter, onlyFavs, system]);

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
            placeholder={`Search ${categoryGames[category].length} games...`}
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

      {!isFeatured && (
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
          {libraryLetters
            .filter((l) => categoryGames[category].some((g) => gameLetter(g) === l))
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
              Hand-picked favorites
            </p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              {onlyFavs && favorites.length === 0
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
                            <Crown size={10} /> FEATURED
                          </p>
                        )}
                        <p
                          className={`font-medium truncate ${isFeatured ? 'text-base' : 'text-sm'}`}
                          style={{ color: 'var(--text)' }}
                        >
                          {game.title}
                        </p>
                        {showTag && (
                          <p className="text-[10px] mt-0.5 tracking-wide" style={{ color: 'var(--text-dim)' }}>
                            {game.system}
                          </p>
                        )}
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
