import { useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { setFlag } from '@/lib/progress';

const VIDEO = 'xvFZjo5PgG0';
let open = false;
const listeners = new Set<() => void>();

/** Called from the V in the SecretV4 title */
export function openRickroll() {
  setFlag('rickroll');
  open = true;
  listeners.forEach((l) => l());
}

/** Full-screen player for the rickroll video, closed with the X or Escape */
export function Rickroll() {
  const [isOpen, setIsOpen] = useState(open);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setIsOpen(open);
    listeners.add(update);
    const onClose = () => {
      open = false;
      listeners.forEach((l) => l());
    };
    window.addEventListener('secretv4-close-game', onClose);
    return () => {
      listeners.delete(update);
      window.removeEventListener('secretv4-close-game', onClose);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    // The click on the V counts as the permission browsers need to go full screen
    void box.current?.requestFullscreen?.().catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const close = () => {
    open = false;
    listeners.forEach((l) => l());
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  };

  if (!isOpen) return null;
  return (
    <div ref={box} className="fixed inset-0 z-[9700] bg-black">
      <iframe
        title="You have been rickrolled"
        src={`https://www.youtube-nocookie.com/embed/${VIDEO}?autoplay=1&rel=0&playsinline=1`}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full border-0"
      />
      <button
        onClick={close}
        aria-label="Close"
        className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium"
        style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff' }}
      >
        <X size={14} /> Close
      </button>
      <a
        href={`https://www.youtube.com/watch?v=${VIDEO}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs"
        style={{ background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff' }}
      >
        <ExternalLink size={13} /> Open on YouTube
      </a>
    </div>
  );
}
