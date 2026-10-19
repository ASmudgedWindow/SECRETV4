import { useEffect, useState } from 'react';

let message: string | null = null;
const listeners = new Set<() => void>();

/** Shows a text message from the site owner (plain text only) */
export function showRemoteMessage(text: string) {
  message = text;
  listeners.forEach((l) => l());
}

export function RemoteMessage() {
  const [text, setText] = useState(message);

  useEffect(() => {
    const update = () => setText(message);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  if (!text) return null;
  const close = () => {
    message = null;
    listeners.forEach((l) => l());
  };
  return (
    <div className="fixed inset-0 z-[9800] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="max-w-sm w-full rounded-xl p-5 text-center" style={{ background: 'var(--panel)', border: '1px solid var(--accent)', boxShadow: '0 0 24px var(--accent-glow)' }}>
        <p className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--accent)' }}>
          Message from SecretV4
        </p>
        <p className="text-base font-medium mb-4 break-words" style={{ color: 'var(--text)' }}>
          {text}
        </p>
        <button onClick={close} className="rounded-lg px-5 py-2 text-sm font-medium" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>
          OK
        </button>
      </div>
    </div>
  );
}
