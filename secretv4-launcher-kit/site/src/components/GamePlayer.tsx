import { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Flag, Maximize2, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { castVote, likedPercent, ratingsEnabled, useRatings } from '@/lib/ratings';
import { beginGameSession, endGameSession, watchFrame } from '@/lib/activity';
import { getSiteConfig, openLink } from '@/lib/siteConfig';

interface GamePlayerProps {
  gameId?: number;
  title: string;
  /** Address of the game file hosted on this site */
  fileUrl: string;
  /** Original Google Drive link, used as the fallback */
  driveUrl: string;
  onClose: () => void;
}

const btn = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  color: 'var(--text-dim)',
} as const;

/** Full-screen window that runs a hosted game in an iframe, with fallbacks if it fails. */
export function GamePlayer({ gameId, title, fileUrl, driveUrl, onClose }: GamePlayerProps) {
  const [loaded, setLoaded] = useState(false);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reported, setReported] = useState(false);
  const { reportUrl } = getSiteConfig();
  const { ratings, mine } = useRatings();
  const ratingsOn = ratingsEnabled() && gameId !== undefined;
  const myVote = gameId !== undefined ? mine[String(gameId)] : undefined;
  const liked = gameId !== undefined ? likedPercent(ratings.get(gameId)) : null;

  const report = () => {
    const text = `Broken game: ${title} (id ${gameId ?? 'unknown'})`;
    if (!/^mailto:/i.test(reportUrl)) {
      // A form can't be pre-filled, so the game name is copied for pasting
      void navigator.clipboard?.writeText(text).catch(() => {});
      setReported(true);
      window.setTimeout(() => setReported(false), 7000);
    }
    openLink(reportUrl, text, `${text}\n\nWhat went wrong?\n`);
  };
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setLoaded(false);
    setSlow(false);
    setFailed(false);
    let cancelled = false;
    // Catches a missing file (iframes do not report 404 errors themselves)
    fetch(fileUrl, { method: 'HEAD' })
      .then((r) => {
        if (!cancelled && !r.ok) setFailed(true);
      })
      .catch(() => {});
    const timer = window.setTimeout(() => setSlow(true), 15000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [fileUrl, attempt]);

  // Active time in this game: only counts while there is real input (see lib/activity.ts)
  useEffect(() => {
    if (gameId === undefined || failed) return;
    beginGameSession(gameId);
    return endGameSession;
  }, [gameId, failed]);

  // Clicks and keys inside the game never reach this page, so listen inside the game's frame as well
  useEffect(() => (frame.current ? watchFrame(frame.current) : undefined), [attempt, failed, fileUrl]);

  const goFullscreen = () => {
    frame.current?.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[9500] flex flex-col" style={{ background: 'var(--bg)' }}>
      <div
        className="flex flex-wrap items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--accent)', background: 'var(--panel)' }}
      >
        <h2 className="text-sm font-semibold mr-auto truncate" style={{ color: 'var(--text)' }}>
          {title}
        </h2>
        {ratingsOn && gameId !== undefined && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => castVote(gameId, 1)}
              aria-label="Thumbs up"
              title="Thumbs up"
              className="flex items-center px-2.5 py-1.5 rounded-lg text-xs"
              style={myVote === 1 ? { ...btn, color: 'var(--accent)', border: '1px solid var(--accent)' } : btn}
            >
              <ThumbsUp size={14} fill={myVote === 1 ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => castVote(gameId, -1)}
              aria-label="Thumbs down"
              title="Thumbs down"
              className="flex items-center px-2.5 py-1.5 rounded-lg text-xs"
              style={myVote === -1 ? { ...btn, color: '#ff6b6b', border: '1px solid #ff6b6b' } : btn}
            >
              <ThumbsDown size={14} fill={myVote === -1 ? 'currentColor' : 'none'} />
            </button>
            <span className="text-xs ml-1" style={{ color: 'var(--text-dim)' }}>
              {liked !== null ? `${liked}% liked` : 'Rate this game'}
            </span>
          </div>
        )}
        <button onClick={goFullscreen} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={btn}>
          <Maximize2 size={14} /> Fullscreen
        </button>
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={btn}>
          <ExternalLink size={14} /> New tab
        </a>
        {reportUrl && (
          <button onClick={report} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={btn}>
            <Flag size={14} /> {reported ? 'Name copied: paste it in the form' : 'Report'}
          </button>
        )}
        <button onClick={onClose} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--accent)', border: '1px solid var(--accent)', color: 'var(--bg)' }}>
          <X size={14} /> Close
        </button>
      </div>

      {failed ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <p className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>
              This game could not be loaded
            </p>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              The copy on SecretV4 is missing or still being published. Wait a minute and try again, or open the original
              from Google Drive.
            </p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setAttempt((n) => n + 1)} className="px-4 py-2 rounded-lg text-sm" style={btn}>
                Try again
              </button>
              <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
                <Download size={14} /> Open on Drive
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex-1">
          <iframe
            key={attempt}
            ref={frame}
            src={fileUrl}
            title={title}
            className="absolute inset-0 w-full h-full border-0"
            style={{ background: '#000' }}
            allow="fullscreen; autoplay; gamepad; clipboard-write; accelerometer; gyroscope"
            allowFullScreen
            onLoad={() => setLoaded(true)}
          />
          {!loaded && slow && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2 text-xs text-center" style={{ background: 'var(--panel)', border: '1px solid var(--accent)', color: 'var(--text-dim)' }}>
              Taking a while. Some games are big.{' '}
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                Open in a new tab
              </a>{' '}
              or{' '}
              <a href={driveUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                use the Drive copy
              </a>
              .
            </div>
          )}
        </div>
      )}
    </div>
  );
}
