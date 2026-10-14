import { useEffect, useRef } from 'react';

interface CloakerProps {
  onCloakReady: () => void;
  enabled: boolean;
}

/**
 * Attempts to open the app in an about:blank tab with an iframe,
 * and redirects the original tab to google.com.
 * If popup blocking prevents this, calls onCloakReady to proceed normally.
 */
export function Cloaker({ onCloakReady, enabled }: CloakerProps) {
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    if (!enabled) {
      onCloakReady();
      return;
    }

    try {
      const win = window.open('about:blank', '_blank');
      if (!win) {
        onCloakReady();
        return;
      }

      const currentUrl = window.location.href;
      const doc = win.document;
      doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Home</title><style>*{margin:0;padding:0;border:0;width:100%;height:100%;overflow:hidden}iframe{width:100vw;height:100vh;border:none}</style></head><body><iframe src="${currentUrl}#cloaked" allow="autoplay; fullscreen; gamepad; clipboard-write; accelerometer; gyroscope" allowfullscreen></iframe></body></html>`);
      doc.close();

      window.location.href = 'https://www.google.com';
    } catch {
      onCloakReady();
    }
  }, [enabled, onCloakReady]);

  return null;
}
