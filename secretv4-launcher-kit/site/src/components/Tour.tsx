import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { STEPS, markTourDone, placeCard, tourDone, tourReducer, type Box, type TourTab } from '@/lib/tour';

interface TourProps {
  tab: TourTab;
  onTab: (tab: TourTab) => void;
}

/** The welcome tour. Shows once for everyone (new or not), then never again unless replayed from Settings. */
export function Tour({ tab, onTab }: TourProps) {
  const [state, dispatch] = useReducer((s: { open: boolean; i: number }, a: Parameters<typeof tourReducer>[1]) => tourReducer(s, a), {
    open: false,
    i: 0,
  });
  const [box, setBox] = useState<Box | null>(null);
  const [cardH, setCardH] = useState(200);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const card = useRef<HTMLDivElement>(null);
  const step = STEPS[state.i];

  // Start once, a moment after the site appears, if it has never been shown
  useEffect(() => {
    if (tourDone()) return;
    const t = window.setTimeout(() => dispatch({ type: 'start' }), 700);
    return () => window.clearTimeout(t);
  }, []);

  // Replay button in Settings
  useEffect(() => {
    const replay = () => dispatch({ type: 'start' });
    window.addEventListener('secretv4-start-tour', replay);
    return () => window.removeEventListener('secretv4-start-tour', replay);
  }, []);

  const finish = useCallback(() => {
    markTourDone();
    dispatch({ type: 'close' });
    onTab('games');
  }, [onTab]);

  const next = useCallback(() => {
    if (state.i >= STEPS.length - 1) finish();
    else dispatch({ type: 'next' });
  }, [state.i, finish]);

  // Go to the right tab, then find what to highlight (after the tab has drawn)
  useEffect(() => {
    if (!state.open) return;
    if (step.tab && step.tab !== tab) onTab(step.tab);
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      setSize({ w: window.innerWidth, h: window.innerHeight });
      if (!step.target) return setBox(null);
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!el) return setBox(null);
      const r = el.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const t = window.setTimeout(measure, step.tab && step.tab !== tab ? 320 : 60);
    window.addEventListener('resize', measure);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open, state.i, tab]);

  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight);
  }, [state.i, state.open, size.w]);

  // Keyboard: arrows and Enter to move, Escape to skip
  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') dispatch({ type: 'back' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.open, next, finish]);

  if (!state.open) return null;

  const cardW = Math.min(340, size.w - 24);
  const pos = placeCard(box, size.w, size.h, cardW, cardH);
  const last = state.i === STEPS.length - 1;
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <>
      {/* Catches clicks so the page can't be used mid-tour */}
      <div className="fixed inset-0" style={{ zIndex: 9300 }} />
      {box ? (
        <div
          className="fixed pointer-events-none"
          style={{
            zIndex: 9300,
            top: box.top - 6,
            left: box.left - 6,
            width: box.width + 12,
            height: box.height + 12,
            borderRadius: 12,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 2px var(--accent), 0 0 24px var(--accent-glow)',
            transition: reduce ? 'none' : 'all 0.25s ease',
          }}
        />
      ) : (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9300, background: 'rgba(0,0,0,0.72)' }} />
      )}
      <div
        ref={card}
        role="dialog"
        aria-label="SecretV4 tour"
        className="fixed rounded-xl p-4"
        style={{
          zIndex: 9301,
          width: cardW,
          top: pos.top,
          left: pos.left,
          background: 'var(--panel)',
          border: '1px solid var(--accent)',
          boxShadow: '0 0 24px var(--accent-glow)',
          transition: reduce ? 'none' : 'top 0.25s ease, left 0.25s ease',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {step.title}
          </h3>
          <button onClick={finish} aria-label="Skip the tour" title="Skip the tour" className="p-0.5 -mt-0.5 -mr-1 rounded" style={{ color: 'var(--text-dim)' }}>
            <X size={16} />
          </button>
        </div>
        <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-dim)' }}>
          {step.text}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] tracking-wider" style={{ color: 'var(--text-dim)' }}>
            {state.i + 1} / {STEPS.length}
          </span>
          <div className="flex items-center gap-2">
            {!last && state.i === 0 && (
              <button onClick={finish} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                Skip
              </button>
            )}
            {state.i > 0 && (
              <button onClick={() => dispatch({ type: 'back' })} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                <ArrowLeft size={12} /> Back
              </button>
            )}
            <button
              autoFocus
              onClick={next}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--accent)', border: '1px solid var(--accent)', color: 'var(--bg)' }}
            >
              {last ? 'Done' : state.i === 0 ? "Let's go" : 'Next'} {!last && <ArrowRight size={12} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
