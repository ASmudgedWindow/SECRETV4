import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';

interface Item {
  id: number;
  text: string;
  from: string;
}

let current: Item | null = null;
let nextId = 0;
const listeners = new Set<() => void>();

/** A short announcement from the staff. Shows in the corner and goes away by itself. */
export function showAnnouncement(text: string, from = '') {
  current = { id: ++nextId, text: text.slice(0, 120), from: from.slice(0, 40) };
  listeners.forEach((l) => l());
}

const SHOW_MS = 7000;

export function Announcement() {
  const [item, setItem] = useState<Item | null>(current);

  useEffect(() => {
    const update = () => setItem(current);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  useEffect(() => {
    if (!item) return;
    const t = window.setTimeout(() => {
      if (current && current.id === item.id) {
        current = null;
        listeners.forEach((l) => l());
      }
    }, SHOW_MS);
    return () => window.clearTimeout(t);
  }, [item]);

  if (!item) return null;
  return (
    <div
      key={item.id}
      className="fixed bottom-4 left-4 z-[9610] max-w-xs rounded-xl px-4 py-3 flex gap-3 items-start animate-slide-up pointer-events-none"
      style={{ background: 'var(--panel)', border: '1px solid var(--accent)', boxShadow: '0 0 18px var(--accent-glow)' }}
    >
      <Megaphone size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          Announcement
        </p>
        {item.from && (
          <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
            {item.from}
          </p>
        )}
        <p className="text-sm mt-1 break-words" style={{ color: 'var(--text)' }}>
          {item.text}
        </p>
      </div>
    </div>
  );
}
