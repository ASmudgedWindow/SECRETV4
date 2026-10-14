import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-width class for the panel */
  maxWidth?: string;
}

export function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl border p-6 animate-slide-up`}
        style={{
          background: 'var(--panel)',
          borderColor: 'var(--accent)',
          boxShadow: '0 0 28px var(--accent-glow)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg"
            style={{ color: 'var(--text-dim)', border: '1px solid var(--border)' }}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
