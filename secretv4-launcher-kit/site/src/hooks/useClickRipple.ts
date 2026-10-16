import { useEffect } from 'react';

/** Adds a soft glow ripple where you click buttons and cards. */
export function useClickRipple() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>('button, .game-card');
      if (!el || el.classList.contains('no-fx') || el.classList.contains('absolute')) return;
      if (el instanceof HTMLButtonElement && el.disabled) return;

      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'fx-ripple';
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      el.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    };

    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);
}
