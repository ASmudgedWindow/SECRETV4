import { createContext, useCallback, useContext, useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { AlertTriangle, Download, FolderOpen, MousePointerClick, Lightbulb, Save, Gamepad2, Gauge } from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { LibraryGame } from '@/data/gameLibrary';
import { GamePlayer } from '@/components/GamePlayer';
import { getSettingsSnapshot } from '@/hooks/useSettings';
import { recordPlay } from '@/lib/plays';
import { findLocalGame, gameFileUrl, loadManifest, randomLocalGame } from '@/lib/manifest';

const HIDE_KEY = 'secretv4-hide-run-guide';
const SEEN_KEY = 'secretv4-run-guide-seen';
const HIDE_TIPS_KEY = 'secretv4-hide-emulator-tips';
const SEEN_TIPS_KEY = 'secretv4-emulator-tips-seen';

function read(storage: 'local' | 'session', key: string): boolean {
  try {
    return (storage === 'local' ? localStorage : sessionStorage).getItem(key) === '1';
  } catch {
    return false;
  }
}

function write(storage: 'local' | 'session', key: string) {
  try {
    (storage === 'local' ? localStorage : sessionStorage).setItem(key, '1');
  } catch {
    // ignore
  }
}

type GameClick = (e: MouseEvent<HTMLElement>, game: Pick<LibraryGame, 'url' | 'kind' | 'system'> & { id?: number; title?: string }) => void;

const GameLaunchContext = createContext<GameClick>(() => {});

/** Use on a game link: onClick={(e) => onGameClick(e, game)} */
export const useGameClick = () => useContext(GameLaunchContext);

const steps = [
  {
    icon: MousePointerClick,
    title: 'Open the game',
    text: 'Press the button at the bottom of this window. Google Drive opens in a new tab.',
  },
  {
    icon: Download,
    title: 'Download the file',
    text: 'On the Drive page, click the download arrow near the top left. The game saves to your Downloads folder.',
  },
  {
    icon: FolderOpen,
    title: 'Start it',
    text: 'On a Chromebook, open the Files app, go to Downloads, and double-click the game. It opens in Chrome and starts right away.',
  },
];

const slowSystems = ['Saturn', 'PlayStation', 'N64', 'DS'];

/** Plain-language tips for the emulated games */
function EmulatorTips({ system }: { system?: string }) {
  const tips = [
    {
      icon: Save,
      title: 'Saving your progress',
      lines: [
        'Before you close the game, move your mouse over the game screen and click the disk icon (Save State).',
        'Your save downloads as a file. Keep it somewhere safe.',
        'Next time, open the game, click the folder icon (Load State), and pick that file.',
      ],
    },
    {
      icon: Gamepad2,
      title: 'Controls',
      lines: [
        'Click the gamepad icon (🎮) on the game screen to see the controls and change them.',
        ...(system === 'Arcade'
          ? ['Arcade games: when it asks you to insert a coin, press V on your keyboard, then press Enter to start.']
          : []),
      ],
    },
    {
      icon: Gauge,
      title: 'If it runs slowly',
      lines: [
        'Some games run poorly, mostly on 3D systems like PlayStation, N64 and DS. Turning off VSync in the emulator\'s graphics settings usually helps.',
        ...(system && slowSystems.includes(system)
          ? [`Known issue: ${system} games may not run well. A partial fix is to open the emulator's graphics settings and change VSync from enabled to disabled.`]
          : []),
        ...(system === 'Bootleg'
          ? ['Bootleg games are unofficial copies. They are known for glitches and crashes, and they are not supported.']
          : []),
      ],
    },
  ];

  return (
    <div className="mb-5">
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
        Emulator tips
      </p>
      <div className="space-y-4">
        {tips.map((tip) => (
          <div key={tip.title} className="flex gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--accent)' }}
            >
              <tip.icon size={16} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {tip.title}
              </p>
              <ul className="mt-0.5 space-y-1">
                {tip.lines.map((line) => (
                  <li key={line} className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GameLaunchProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{ url: string; system?: string; showBase: boolean; showTips: boolean; reason: 'setting' | 'notHosted' } | null>(null);
  // Seconds left before the Drive button unlocks (forces people to see the steps)
  const [wait, setWait] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const [playing, setPlaying] = useState<{ id?: number; title: string; fileUrl: string; driveUrl: string } | null>(null);

  useEffect(() => {
    void loadManifest();
  }, []);

  // The owner tools can close whatever game is open, or open a random one
  useEffect(() => {
    const close = () => setPlaying(null);
    const random = () => {
      const g = randomLocalGame();
      if (g && g.file) setPlaying({ id: g.id, title: g.title, fileUrl: gameFileUrl(g.file), driveUrl: g.drive_url || '' });
    };
    window.addEventListener('secretv4-close-game', close);
    window.addEventListener('secretv4-random-game', random);
    return () => {
      window.removeEventListener('secretv4-close-game', close);
      window.removeEventListener('secretv4-random-game', random);
    };
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const onGameClick = useCallback<GameClick>((e, game) => {
    // Only game files on Google Drive need the guide
    if (!game.url.includes('drive.google.com')) {
      recordPlay(game.id); // opens on another site: counts as a play
      return;
    }
    // A copy hosted on this site plays right here instead of sending people to Drive
    // (unless "Google Drive Links Only" is turned on in Settings)
    const driveOnly = getSettingsSnapshot().driveLinksOnly;
    const local = driveOnly ? undefined : findLocalGame(game.url);
    if (local && local.file) {
      e.preventDefault();
      recordPlay(game.id); // plays on this site: counts as a play (Drive downloads never do)
      setPlaying({ id: game.id, title: game.title || local.title, fileUrl: gameFileUrl(local.file), driveUrl: game.url });
      return;
    }
    const showBase = !(read('local', HIDE_KEY) || read('session', SEEN_KEY));
    const showTips = game.kind === 'emulated' && !(read('local', HIDE_TIPS_KEY) || read('session', SEEN_TIPS_KEY));
    if (!showBase && !showTips) return;
    e.preventDefault();
    setDontShow(false);
    setPending({ url: game.url, system: game.system, showBase, showTips, reason: driveOnly ? 'setting' : 'notHosted' });
    setWait(showBase ? 4 : 0);
  }, []);

  const proceed = () => {
    if (!pending || wait > 0) return;
    if (pending.showBase) {
      write('session', SEEN_KEY);
      if (dontShow) write('local', HIDE_KEY);
    }
    if (pending.showTips) {
      write('session', SEEN_TIPS_KEY);
      if (dontShow) write('local', HIDE_TIPS_KEY);
    }
    window.open(pending.url, '_blank', 'noopener,noreferrer');
    setPending(null);
  };

  return (
    <GameLaunchContext.Provider value={onGameClick}>
      {children}
      {playing && (
        <GamePlayer
          gameId={playing.id}
          title={playing.title}
          fileUrl={playing.fileUrl}
          driveUrl={playing.driveUrl}
          onClose={() => setPlaying(null)}
        />
      )}
      {pending && (
        <Modal
          title={pending.showBase ? 'How to play this game' : 'Before you play: emulator tips'}
          onClose={() => setPending(null)}
        >
          {pending.showBase && (
            <>
          <div
            className="rounded-lg p-4 mb-4"
            style={{ background: 'rgba(255, 59, 59, 0.14)', border: '2px solid #ff3b3b' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle size={22} className="animate-pulse flex-shrink-0" style={{ color: '#ff3b3b' }} />
              <p className="text-lg font-extrabold tracking-wide" style={{ color: '#ff3b3b' }}>
                READ THIS!
              </p>
            </div>
            <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text)' }}>
              This game will NOT play on this site. Google Drive only gives you a file to download. If you just press
              the button, you will end up on a Drive page and nothing will start.
            </p>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              {pending.reason === 'setting'
                ? 'You are seeing this because "Google Drive Links Only" is turned on in Settings. Turn it off to play games on this site.'
                : 'You are seeing this because this game is not hosted on this site (it is not copied here yet, or it is too big).'}
            </p>
          </div>

          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>
            Do these 3 steps:
          </p>

          <ol className="space-y-4 mb-5">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--accent)' }}
                >
                  <step.icon size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {i + 1}. {step.title}
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div
            className="flex gap-3 rounded-lg p-3 mb-5"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            <Lightbulb size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              Double-clicking does nothing? Install an HTML file viewer app or extension from the Chrome Web Store.
              It lets you open these files with one click. On Windows or Mac, double-clicking the downloaded file
              works too.
            </p>
          </div>
            </>
          )}

          {pending.showTips && <EmulatorTips system={pending.system} />}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label
              className="flex items-center gap-2 text-xs cursor-pointer select-none"
              style={{ color: 'var(--text-dim)' }}
            >
              <input type="checkbox" checked={dontShow} onChange={(e) => setDontShow(e.target.checked)} />
              Don't show this again
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPending(null)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
              >
                Cancel
              </button>
              <button
                onClick={proceed}
                disabled={wait > 0}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  color: 'var(--bg)',
                  opacity: wait > 0 ? 0.45 : 1,
                  cursor: wait > 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {wait > 0 ? `Read the steps (${wait})` : pending.showBase ? 'I read it, open Google Drive' : 'Open game'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </GameLaunchContext.Provider>
  );
}
