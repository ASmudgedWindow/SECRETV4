import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { libraryGames, type LibraryGame } from '@/data/gameLibrary';
import { themes } from '@/data/themes';
import { searchScore } from '@/lib/search';
import { useGameClick } from '@/components/GameLaunchProvider';
import { useSettings } from '@/hooks/useSettings';
import { usePlays } from '@/lib/plays';
import { streaksOf, useProgress } from '@/lib/progress';
import { useCollections } from '@/lib/collections';
import { ACHIEVEMENTS, formatDuration, isDone, useAchievementContext, useFavoriteCount } from '@/lib/achievements';
import { openRickroll } from '@/components/Rickroll';
import { grubby, rainbow, spinPage } from '@/lib/trolls';
import { run as runRemote, shortBrowser } from '@/lib/remote';
import { gotoTab } from '@/lib/nav';
import { completions, execute, type LineKind, type TerminalApi } from '@/lib/terminalCommands';
import { addLine, clearAll, getLines, getUnlocked, history, removeLine, startSpam, stopRunning, subscribe, takeBanner, typewriter, unlock } from '@/lib/terminalStore';

const gameById = new Map(libraryGames.map((g) => [g.id, g]));
const PROMPT = 'guest@secretv4:~$ ';
const MATRIX_KEY = 'secretv4-terminal-matrix';

function loadMatrix(): boolean {
  try {
    return localStorage.getItem(MATRIX_KEY) === '1';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The matrix rain (stays on until you type matrix again)
// ---------------------------------------------------------------------------
function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789';
    const size = 16;
    let w = 0;
    let h = 0;
    let drops: number[] = [];
    const fit = () => {
      w = canvas.width = canvas.clientWidth;
      h = canvas.height = canvas.clientHeight;
      drops = Array.from({ length: Math.ceil(w / size) }, () => Math.random() * -50);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    let raf = 0;
    let last = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 55) return;
      last = t;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#1aff5c';
      ctx.font = `${size}px monospace`;
      drops.forEach((y, i) => {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * size, y * size);
        drops[i] = y * size > h && Math.random() > 0.975 ? 0 : y + 1;
      });
    };
    if (!reduce) raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" style={{ opacity: 0.55, pointerEvents: 'none' }} />;
}

// ---------------------------------------------------------------------------
// A very simple drawing pad
// ---------------------------------------------------------------------------
function DrawPad({ onClose }: { onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState('#ffffff');
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const point = (e: ReactPointerEvent) => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };
  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvas.current!.getContext('2d')!;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };
  const wipe = () => {
    const ctx = canvas.current!.getContext('2d')!;
    ctx.fillStyle = '#0b0f10';
    ctx.fillRect(0, 0, canvas.current!.width, canvas.current!.height);
  };
  useEffect(wipe, []);

  const swatch = ['#ffffff', '#ff5c5c', '#ffd24d', '#3dff7a', '#5cc8ff', '#c77dff'];
  return (
    <div className="my-2" onClick={(e) => e.stopPropagation()}>
      <canvas
        ref={canvas}
        width={480}
        height={240}
        className="rounded-lg border w-full"
        style={{ maxWidth: 480, touchAction: 'none', cursor: 'crosshair', borderColor: 'var(--border)' }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          drawing.current = true;
          const p = point(e);
          last.current = p;
          stroke(p, { x: p.x + 0.1, y: p.y });
        }}
        onPointerMove={(e) => {
          if (!drawing.current || !last.current) return;
          const p = point(e);
          stroke(last.current, p);
          last.current = p;
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
        }}
      />
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {swatch.map((c) => (
          <button key={c} aria-label={`Color ${c}`} onClick={() => setColor(c)} className="w-6 h-6 rounded-full" style={{ background: c, border: color === c ? '2px solid var(--accent)' : '2px solid transparent' }} />
        ))}
        <button onClick={wipe} className="px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
          Clear
        </button>
        <button onClick={onClose} className="px-2 py-1 rounded text-xs" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The terminal
// ---------------------------------------------------------------------------
export function Terminal() {
  const all = useSyncExternalStore(subscribe, getLines);
  const [input, setInput] = useState('');
  const [matrix, setMatrix] = useState(loadMatrix);
  const matrixRef = useRef(matrix);
  const histPos = useRef(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onGameClick = useGameClick();
  const { settings, update } = useSettings();
  const plays = usePlays();
  const progress = useProgress();
  const collections = useCollections();
  const favorites = useFavoriteCount();
  const achCtx = useAchievementContext();

  // The newest of everything, for commands that run later
  const live = useRef({ onGameClick, update, settings, plays, progress, collections, favorites, achCtx });
  live.current = { onGameClick, update, settings, plays, progress, collections, favorites, achCtx };

  const api: TerminalApi = useMemo(
    () => ({
      print: (text, kind = 'out', onClick) => void addLine({ text, kind, onClick }),
      typewriter,
      clear: clearAll,
      gotoTab,
      findGames: (q, max) =>
        libraryGames
          .map((g) => ({ g, s: searchScore(g, q) }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, max)
          .map((x) => x.g),
      findGameByTitle: (title) => libraryGames.find((g) => g.title.toLowerCase() === title.toLowerCase()),
      openGame: (game: LibraryGame) => {
        // Same flow as clicking the game's card. If it decides not to handle it, open the link ourselves.
        const fake = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
        live.current.onGameClick(fake as never, game);
        if (!fake.defaultPrevented) window.open(game.url, '_blank', 'noopener,noreferrer');
      },
      recentGames: () => live.current.plays.recent.map((id) => gameById.get(id)).filter((g): g is LibraryGame => !!g),
      setTheme: (themeId) => {
        live.current.update({ themeId });
        return themes.find((t) => t.id === themeId)?.name ?? themeId;
      },
      whoami: () => {
        const { settings: s, plays: p, progress: pr, collections: c, favorites: f, achCtx: ctx } = live.current;
        const role = (() => {
          try {
            return localStorage.getItem('secretv4-staff') || '';
          } catch {
            return '';
          }
        })();
        const played = Object.values(p.counts).filter((n) => n > 0).length;
        const earned = ACHIEVEMENTS.filter((a) => pr.unlocked[a.id] || isDone(a, ctx)).length;
        const streak = streaksOf(pr.days);
        const row = (k: string, v: string) => `${(k + ':').padEnd(15)}${v}`;
        return [
          'guest@secretv4',
          '--------------',
          row('User', role === 'owner' || role === 'admin' ? `guest (${role})` : 'guest (visitor)'),
          row('Browser', shortBrowser()),
          row('Theme', themes.find((t) => t.id === s.themeId)?.name ?? s.themeId),
          row('Games played', String(played)),
          row('Favorites', String(f)),
          row('Collections', String(c.length)),
          row('Achievements', `${earned} / ${ACHIEVEMENTS.length}`),
          row('Active time', formatDuration(pr.active)),
          row('Best streak', `${Math.max(streak.best, pr.bestStreak)} days`),
          row('Here since', new Date(pr.since).toLocaleDateString()),
        ];
      },
      now: () => new Date(),
      random: Math.random,
      isAdmin: () => {
        try {
          const r = localStorage.getItem('secretv4-staff');
          return r === 'owner' || r === 'admin';
        } catch {
          return false;
        }
      },
      unlock,
      unlocked: getUnlocked,
      effects: {
        rickroll: openRickroll,
        toggleMatrix: () => {
          const next = !matrixRef.current;
          matrixRef.current = next;
          setMatrix(next);
          try {
            localStorage.setItem(MATRIX_KEY, next ? '1' : '0');
          } catch {
            // ignore
          }
          return next;
        },
        grubby,
        rainbow,
        spin: spinPage,
        smile: () => {
          const id = addLine({ text: 'ihasabucket.com (5 seconds)', kind: 'dim', widget: 'frame' });
          window.setTimeout(() => removeLine(id), 5000);
        },
        draw: () => {
          addLine({ text: '', kind: 'out', widget: 'draw' });
        },
        spam: startSpam,
        exit: () => runRemote({ id: 0, type: 'close_tab' }),
      },
    }),
    [],
  );

  // First time in: a short welcome
  useEffect(() => {
    if (takeBanner()) {
      addLine({ text: "SecretV4 Terminal. Type 'help' to see what you can do.", kind: 'dim' });
    }
    inputRef.current?.focus();
    // Leaving the tab stops anything still running (like spam)
    return () => stopRunning();
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [all]);

  const submit = () => {
    const cmd = input;
    setInput('');
    histPos.current = -1;
    addLine({ text: PROMPT + cmd, kind: 'cmd' });
    if (cmd.trim()) history.push(cmd);
    void execute(cmd, api);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      histPos.current = histPos.current < 0 ? history.length - 1 : Math.max(0, histPos.current - 1);
      setInput(history[histPos.current]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histPos.current < 0) return;
      histPos.current += 1;
      if (histPos.current >= history.length) {
        histPos.current = -1;
        setInput('');
      } else setInput(history[histPos.current]);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const options = completions(input.trimStart(), getUnlocked());
      if (options.length === 1) setInput(options[0] + ' ');
      else if (options.length > 1) addLine({ text: options.join('   '), kind: 'dim' });
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      clearAll();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      stopRunning();
      addLine({ text: PROMPT + input + '^C', kind: 'cmd' });
      setInput('');
    }
  };

  const colour: Record<LineKind, string> = {
    out: matrix ? '#3dff7a' : 'var(--text)',
    dim: matrix ? '#1fb54f' : 'var(--text-dim)',
    error: '#ff6b6b',
    cmd: matrix ? '#3dff7a' : 'var(--text)',
    big: 'var(--text)',
  };

  return (
    <div
      className="relative h-full flex flex-col rounded-xl border overflow-hidden"
      style={{ background: matrix ? '#000' : 'rgba(2, 6, 6, 0.88)', borderColor: matrix ? '#1aff5c' : 'var(--border)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
      onClick={() => {
        if (!window.getSelection()?.toString()) inputRef.current?.focus();
      }}
    >
      {matrix && <MatrixRain />}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed" style={{ zIndex: 1 }}>
        {all.map((l) => {
          if (l.widget === 'draw') return <DrawPad key={l.id} onClose={() => removeLine(l.id)} />;
          if (l.widget === 'frame')
            return (
              <div key={l.id} className="my-2" onClick={(e) => e.stopPropagation()}>
                <iframe
                  title="ihasabucket.com"
                  src="https://ihasabucket.com"
                  sandbox="allow-scripts"
                  referrerPolicy="no-referrer"
                  className="w-full rounded-lg border"
                  style={{ height: 260, borderColor: 'var(--border)', background: '#000' }}
                />
                <div className="text-xs" style={{ color: colour.dim }}>
                  {l.text}
                </div>
              </div>
            );
          if (l.kind === 'cmd')
            return (
              <div key={l.id} className="whitespace-pre-wrap break-all">
                <span style={{ color: matrix ? '#1aff5c' : 'var(--accent)' }}>{PROMPT}</span>
                <span style={{ color: colour.cmd }}>{l.text.slice(PROMPT.length)}</span>
              </div>
            );
          return (
            <div
              key={l.id}
              className="whitespace-pre-wrap break-all"
              style={{ color: l.onClick ? 'var(--accent)' : colour[l.kind], cursor: l.onClick ? 'pointer' : 'text', textDecoration: l.onClick ? 'underline' : 'none', minHeight: '1.4em' }}
              onClick={l.onClick}
              role={l.onClick ? 'button' : undefined}
            >
              {l.text}
            </div>
          );
        })}
        <div className="flex items-center" style={{ color: colour.cmd }}>
          <span className="whitespace-pre" style={{ color: matrix ? '#1aff5c' : 'var(--accent)' }}>
            {PROMPT}
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            aria-label="Terminal input"
            className="flex-1 min-w-0 bg-transparent outline-none"
            style={{ color: 'inherit', font: 'inherit' }}
          />
        </div>
      </div>
    </div>
  );
}
