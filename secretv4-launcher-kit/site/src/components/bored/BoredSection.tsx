import { useEffect, useRef, useState } from 'react';
import { Shuffle, Zap, MousePointerClick, Dices, Lightbulb, Play, Globe, type LucideIcon } from 'lucide-react';
import { libraryGames, type LibraryGame } from '@/data/gameLibrary';
import { boredLinks } from '@/data/links';
import { LinkGrid } from '@/components/LinkGrid';
import { useGameClick } from '@/components/GameLaunchProvider';
import { setFlag, setRecord } from '@/lib/progress';

const btn = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--accent)',
  color: 'var(--accent)',
} as const;

function Card({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-5 animate-slide-up"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <Icon size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function RandomGame() {
  const [game, setGame] = useState<LibraryGame | null>(null);
  const onGameClick = useGameClick();
  const roll = () => setGame(libraryGames[Math.floor(Math.random() * libraryGames.length)]);
  return (
    <Card title="Random Game" icon={Shuffle}>
      <p className="text-xs mb-3" style={{ color: 'var(--text-dim)' }}>
        Can't decide? Let fate pick from all {libraryGames.length} games.
      </p>
      {game && (
        <div className="flex items-center justify-between gap-2 mb-3 rounded-lg p-3" style={{ background: 'var(--bg-tertiary)' }}>
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
            {game.title}
          </p>
          <a href={game.url} target="_blank" rel="noopener noreferrer" onClick={(e) => onGameClick(e, game)} className="flex items-center gap-1 text-xs" style={{ color: 'var(--accent)' }}>
            <Play size={12} /> Play
          </a>
        </div>
      )}
      <button onClick={roll} className="px-4 py-2 rounded-lg text-sm" style={btn}>
        {game ? 'Reroll' : 'Pick one for me'}
      </button>
    </Card>
  );
}

type ReactionState = 'idle' | 'waiting' | 'go' | 'early' | 'result';

function ReactionTest() {
  const [state, setState] = useState<ReactionState>('idle');
  const [ms, setMs] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const start = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const click = () => {
    if (state === 'idle' || state === 'early' || state === 'result') {
      setState('waiting');
      timer.current = window.setTimeout(() => {
        start.current = performance.now();
        setState('go');
      }, 1500 + Math.random() * 3000);
    } else if (state === 'waiting') {
      window.clearTimeout(timer.current);
      setState('early');
    } else if (state === 'go') {
      const t = Math.round(performance.now() - start.current);
      setMs(t);
      setRecord('bestReaction', t);
      setBest((b) => (b === null || t < b ? t : b));
      setState('result');
    }
  };

  const label: Record<ReactionState, string> = {
    idle: 'Click to start',
    waiting: 'Wait for green...',
    go: 'CLICK!',
    early: 'Too early! Click to retry',
    result: `${ms} ms — click to go again`,
  };

  return (
    <Card title="Reaction Test" icon={Zap}>
      <button
        onClick={click}
        className="w-full h-24 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: state === 'go' ? '#1f9d55' : state === 'waiting' ? '#8a2b2b' : 'var(--bg-tertiary)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
      >
        {label[state]}
      </button>
      {best !== null && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>
          Best: <span style={{ color: 'var(--accent)' }}>{best} ms</span>
        </p>
      )}
    </Card>
  );
}

function ClickSpeed() {
  const DURATION = 5;
  const [clicks, setClicks] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [best, setBest] = useState(0);
  const endAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const remaining = Math.max(0, (endAt.current - Date.now()) / 1000);
      setLeft(remaining);
      if (remaining <= 0) {
        setRunning(false);
        setDone(true);
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (done) {
      setBest((b) => Math.max(b, clicks / DURATION));
      setRecord('bestCps', clicks / DURATION);
    }
  }, [done, clicks]);

  const click = () => {
    if (!running) {
      setClicks(1);
      setDone(false);
      endAt.current = Date.now() + DURATION * 1000;
      setLeft(DURATION);
      setRunning(true);
    } else {
      setClicks((c) => c + 1);
    }
  };

  return (
    <Card title="Click Speed Test" icon={MousePointerClick}>
      <button
        onClick={click}
        className="w-full h-24 rounded-lg text-sm font-medium select-none"
        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text)' }}
      >
        {running ? `${clicks} clicks — ${left.toFixed(1)}s` : done ? `${(clicks / DURATION).toFixed(1)} CPS — click to retry` : `Click as fast as you can for ${DURATION}s`}
      </button>
      {best > 0 && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>
          Best: <span style={{ color: 'var(--accent)' }}>{best.toFixed(1)} CPS</span>
        </p>
      )}
    </Card>
  );
}

function CoinAndDice() {
  const [result, setResult] = useState('—');
  const flip = () => setResult(Math.random() < 0.5 ? 'Heads' : 'Tails');
  const roll = (sides: number) => {
    const n = 1 + Math.floor(Math.random() * sides);
    setResult(`d${sides}: ${n}`);
    if (sides === 20 && n === 20) setFlag('nat20');
  };
  return (
    <Card title="Coin & Dice" icon={Dices}>
      <p className="text-2xl font-mono font-bold mb-3" style={{ color: 'var(--accent)' }}>
        {result}
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={flip} className="px-3 py-1.5 rounded-lg text-xs" style={btn}>
          Flip coin
        </button>
        {[6, 20, 100].map((s) => (
          <button key={s} onClick={() => roll(s)} className="px-3 py-1.5 rounded-lg text-xs" style={btn}>
            Roll d{s}
          </button>
        ))}
      </div>
    </Card>
  );
}

const ideas = [
  'Learn a card trick and show it to someone.',
  'Try to draw your room from memory, then compare.',
  'Make up a tiny game with a coin and a pen.',
  'Write down 5 things you want to do this month.',
  'Try to beat your best score in your favorite game.',
  'Learn to say "hello" in three languages.',
  'Build the tallest tower you can from random stuff.',
  'Make a playlist for a road trip you will never take.',
  'Invent a new word and define it.',
  'Learn how to solve a Rubik\'s cube (or just one side).',
  'Challenge a friend to a 1-minute drawing contest.',
  'Rank your top 10 games of all time.',
  'Go for a 10-minute walk with no phone.',
  'Try to juggle with three balled-up socks.',
  'Write a six-word story.',
];

function IdeaGenerator() {
  const [i, setI] = useState(() => Math.floor(Math.random() * ideas.length));
  return (
    <Card title="Something to Do" icon={Lightbulb}>
      <p className="text-sm mb-3 min-h-[2.5rem]" style={{ color: 'var(--text)' }}>
        {ideas[i]}
      </p>
      <button
        onClick={() => setI((cur) => (cur + 1 + Math.floor(Math.random() * (ideas.length - 1))) % ideas.length)}
        className="px-4 py-2 rounded-lg text-sm"
        style={btn}
      >
        Another idea
      </button>
    </Card>
  );
}

export function BoredSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <Card title="Fun Sites" icon={Globe}>
          <LinkGrid links={boredLinks} />
        </Card>
      </div>
      <RandomGame />
      <IdeaGenerator />
      <ReactionTest />
      <ClickSpeed />
      <CoinAndDice />
    </div>
  );
}
