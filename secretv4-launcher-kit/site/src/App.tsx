import { useState, useCallback } from 'react';
import { Cloaker } from '@/components/Cloaker';
import { Intro } from '@/components/Intro';
import { AppShell } from '@/components/AppShell';
import { BackgroundCanvas } from '@/components/BackgroundCanvas';
import { useSettings } from '@/hooks/useSettings';
import { useLookalikeFilter } from '@/hooks/useLookalikeFilter';

type Phase = 'cloaking' | 'intro' | 'ready';

function App() {
  const [phase, setPhase] = useState<Phase>('cloaking');
  const { settings, theme } = useSettings();
  useLookalikeFilter(settings.lookalikeText);

  const handleCloakReady = useCallback(() => {
    setPhase('intro');
  }, []);

  const handleIntroComplete = useCallback(() => {
    setPhase('ready');
  }, []);

  // If we're inside the cloaked iframe (URL has #cloaked), skip cloaking
  const isCloakedFrame = window.location.hash === '#cloaked';

  if (!isCloakedFrame && phase === 'cloaking') {
    return <Cloaker onCloakReady={handleCloakReady} enabled={settings.aboutBlankCloaking} />;
  }

  if (phase === 'cloaking') {
    // We're in the iframe, go straight to intro
    return <Cloaker onCloakReady={handleCloakReady} enabled={false} />;
  }

  if (phase === 'intro') {
    return <Intro onComplete={handleIntroComplete} />;
  }

  return (
    <>
      <BackgroundCanvas id={settings.background} colors={theme.colors} />
      <div className="scan-overlay" />
      <AppShell />
    </>
  );
}

export default App;
