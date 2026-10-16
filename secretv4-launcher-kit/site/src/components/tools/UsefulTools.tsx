import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calculator as CalcIcon,
  Timer,
  StickyNote,
  KeyRound,
  ArrowLeftRight,
  Type,
  Copy,
  Check,
  Languages,
  type LucideIcon,
} from 'lucide-react';
import { toLookalike, fromLookalike } from '@/lib/lookalike';
import { useSettings } from '@/hooks/useSettings';

/* ---------- shared bits ---------- */

const inputStyle = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
} as const;

const accentBtn = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--accent)',
  color: 'var(--accent)',
} as const;

const plainBtn = {
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
} as const;

/* ---------- Calculator ---------- */

/** Small recursive-descent parser so we never need eval(). */
function evaluate(input: string): number {
  const expr = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  const tokens = expr.match(/\d+\.?\d*|\.\d+|[()+\-*/%^]/g);
  if (!tokens || tokens.join('') !== expr) throw new Error('Invalid expression');
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  const atom = (): number => {
    const t = next();
    if (t === undefined) throw new Error('Unexpected end');
    if (t === '(') {
      const v = sum();
      if (next() !== ')') throw new Error('Missing )');
      return v;
    }
    const n = Number(t);
    if (Number.isNaN(n)) throw new Error('Bad number');
    return n;
  };
  const power = (): number => {
    const base = atom();
    if (peek() === '^') {
      next();
      return Math.pow(base, unary());
    }
    return base;
  };
  const unary = (): number => {
    if (peek() === '-') {
      next();
      return -unary();
    }
    if (peek() === '+') {
      next();
      return unary();
    }
    return power();
  };
  const product = (): number => {
    let v = unary();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = next();
      const r = unary();
      v = op === '*' ? v * r : op === '/' ? v / r : v % r;
    }
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const r = product();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };

  const result = sum();
  if (pos !== tokens.length) throw new Error('Unexpected token');
  return result;
}

function Calculator() {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');

  const calc = () => {
    if (!expr.trim()) return;
    try {
      const v = evaluate(expr);
      if (!Number.isFinite(v)) throw new Error('Not finite');
      const out = String(Math.round(v * 1e10) / 1e10);
      setResult(out);
      setExpr(out);
    } catch {
      setResult('Error');
    }
  };

  const keys = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '(', '+', ')', '%', '^'];

  return (
    <div className="max-w-xs">
      <input
        value={expr}
        onChange={(e) => {
          setExpr(e.target.value);
          setResult('');
        }}
        onKeyDown={(e) => e.key === 'Enter' && calc()}
        placeholder="0"
        className="w-full rounded-lg px-3 py-3 text-right text-xl font-mono outline-none"
        style={inputStyle}
      />
      <p className="text-right text-xs h-5 mt-1" style={{ color: 'var(--text-dim)' }}>
        {result && result !== expr ? `= ${result}` : result === 'Error' ? 'Error' : ''}
      </p>
      <div className="grid grid-cols-4 gap-2 mt-2">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => {
              setExpr((e) => e + k);
              setResult('');
            }}
            className="py-2.5 rounded-lg text-sm font-mono"
            style={plainBtn}
          >
            {k}
          </button>
        ))}
        <button onClick={() => setExpr((e) => e.slice(0, -1))} className="py-2.5 rounded-lg text-sm" style={plainBtn}>
          ⌫
        </button>
        <button
          onClick={() => {
            setExpr('');
            setResult('');
          }}
          className="py-2.5 rounded-lg text-sm"
          style={plainBtn}
        >
          C
        </button>
        <button onClick={calc} className="col-span-2 py-2.5 rounded-lg text-sm font-bold" style={accentBtn}>
          =
        </button>
      </div>
    </div>
  );
}

/* ---------- Stopwatch & Timer ---------- */

const fmt = (ms: number) => {
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const t = Math.floor((total % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(t).padStart(2, '0')}`;
};

function Stopwatch() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const base = useRef(0);

  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now() - base.current;
    const id = window.setInterval(() => {
      base.current = Date.now() - startedAt;
      setElapsed(base.current);
    }, 30);
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <div>
      <p className="text-xs mb-2" style={{ color: 'var(--text-dim)' }}>Stopwatch</p>
      <p className="text-3xl font-mono font-bold mb-3" style={{ color: 'var(--accent)' }}>{fmt(elapsed)}</p>
      <div className="flex gap-2">
        <button onClick={() => setRunning((r) => !r)} className="px-4 py-2 rounded-lg text-sm" style={accentBtn}>
          {running ? 'Stop' : 'Start'}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            base.current = 0;
            setElapsed(0);
          }}
          className="px-4 py-2 rounded-lg text-sm"
          style={plainBtn}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function Countdown() {
  const [minutes, setMinutes] = useState('5');
  const [left, setLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const remaining = endAt.current - Date.now();
      if (remaining <= 0) {
        setLeft(0);
        setRunning(false);
      } else {
        setLeft(remaining);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [running]);

  const start = () => {
    const mins = parseFloat(minutes);
    if (!mins || mins <= 0) return;
    const remaining = left !== null && left > 0 ? left : mins * 60000;
    endAt.current = Date.now() + remaining;
    setLeft(remaining);
    setRunning(true);
  };

  return (
    <div>
      <p className="text-xs mb-2" style={{ color: 'var(--text-dim)' }}>Countdown timer</p>
      <p className="text-3xl font-mono font-bold mb-3" style={{ color: left === 0 ? '#ff6b6b' : 'var(--accent)' }}>
        {left === null ? fmt(parseFloat(minutes || '0') * 60000) : fmt(left)}
      </p>
      {left === 0 && <p className="text-xs mb-2" style={{ color: '#ff6b6b' }}>Time's up!</p>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          min="0"
          value={minutes}
          onChange={(e) => {
            setMinutes(e.target.value);
            setLeft(null);
            setRunning(false);
          }}
          className="w-20 rounded-lg px-3 py-2 text-sm outline-none"
          style={inputStyle}
        />
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>min</span>
        <button
          onClick={() => (running ? setRunning(false) : start())}
          className="px-4 py-2 rounded-lg text-sm"
          style={accentBtn}
        >
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setLeft(null);
          }}
          className="px-4 py-2 rounded-lg text-sm"
          style={plainBtn}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function TimerTools() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Stopwatch />
      <Countdown />
    </div>
  );
}

/* ---------- Notes ---------- */

const NOTES_KEY = 'secretv4-notes';

function Notes() {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(NOTES_KEY) ?? '';
    } catch {
      return '';
    }
  });

  const change = (v: string) => {
    setText(v);
    try {
      localStorage.setItem(NOTES_KEY, v);
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => change(e.target.value)}
        placeholder="Jot something down — it saves automatically in this browser."
        rows={10}
        className="w-full rounded-lg p-3 text-sm outline-none resize-y font-mono"
        style={inputStyle}
      />
      <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{text.length} characters · saved locally</p>
    </div>
  );
}

/* ---------- Password generator ---------- */

function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / max) * max;
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % max;
}

function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [upper, setUpper] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => {
    let chars = 'abcdefghijklmnopqrstuvwxyz';
    if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (digits) chars += '0123456789';
    if (symbols) chars += '!@#$%^&*()-_=+[]{};:,.?';
    let out = '';
    for (let i = 0; i < length; i++) out += chars[randomInt(chars.length)];
    setPassword(out);
    setCopied(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      // clipboard may be blocked in iframes
    }
  };

  const toggle = (label: string, value: boolean, set: (v: boolean) => void) => (
    <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--text-dim)' }}>
      <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} />
      {label}
    </label>
  );

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-2 mb-3">
        <input readOnly value={password} placeholder="Click Generate" className="flex-1 rounded-lg px-3 py-2.5 text-sm font-mono outline-none" style={inputStyle} />
        <button onClick={copy} disabled={!password} className="p-2.5 rounded-lg" style={plainBtn} aria-label="Copy password">
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <label className="text-xs block mb-1" style={{ color: 'var(--text-dim)' }}>Length: {length}</label>
      <input type="range" min={6} max={64} value={length} onChange={(e) => setLength(Number(e.target.value))} className="w-full mb-3" />
      <div className="flex flex-wrap gap-4 mb-4">
        {toggle('A–Z', upper, setUpper)}
        {toggle('0–9', digits, setDigits)}
        {toggle('Symbols', symbols, setSymbols)}
      </div>
      <button onClick={generate} className="px-4 py-2 rounded-lg text-sm" style={accentBtn}>Generate</button>
    </div>
  );
}

/* ---------- Unit converter ---------- */

type Unit = { label: string; toBase: number };
const lengthUnits: Record<string, Unit> = {
  m: { label: 'Meters', toBase: 1 },
  km: { label: 'Kilometers', toBase: 1000 },
  cm: { label: 'Centimeters', toBase: 0.01 },
  mm: { label: 'Millimeters', toBase: 0.001 },
  mi: { label: 'Miles', toBase: 1609.344 },
  yd: { label: 'Yards', toBase: 0.9144 },
  ft: { label: 'Feet', toBase: 0.3048 },
  in: { label: 'Inches', toBase: 0.0254 },
};
const weightUnits: Record<string, Unit> = {
  kg: { label: 'Kilograms', toBase: 1 },
  g: { label: 'Grams', toBase: 0.001 },
  lb: { label: 'Pounds', toBase: 0.45359237 },
  oz: { label: 'Ounces', toBase: 0.028349523125 },
};
const tempUnits = { c: 'Celsius', f: 'Fahrenheit', k: 'Kelvin' } as const;

function convertTemp(v: number, from: string, to: string): number {
  const c = from === 'f' ? ((v - 32) * 5) / 9 : from === 'k' ? v - 273.15 : v;
  return to === 'f' ? (c * 9) / 5 + 32 : to === 'k' ? c + 273.15 : c;
}

function UnitConverter() {
  const [kind, setKind] = useState<'length' | 'weight' | 'temp'>('length');
  const [value, setValue] = useState('1');
  const [from, setFrom] = useState('m');
  const [to, setTo] = useState('ft');

  const options: [string, string][] = useMemo(() => {
    if (kind === 'length') return Object.entries(lengthUnits).map(([k, u]) => [k, u.label]);
    if (kind === 'weight') return Object.entries(weightUnits).map(([k, u]) => [k, u.label]);
    return Object.entries(tempUnits);
  }, [kind]);

  const switchKind = (k: 'length' | 'weight' | 'temp') => {
    setKind(k);
    if (k === 'length') { setFrom('m'); setTo('ft'); }
    if (k === 'weight') { setFrom('kg'); setTo('lb'); }
    if (k === 'temp') { setFrom('c'); setTo('f'); }
  };

  const n = parseFloat(value);
  let out = '';
  if (!Number.isNaN(n)) {
    let r: number;
    if (kind === 'temp') r = convertTemp(n, from, to);
    else {
      const table = kind === 'length' ? lengthUnits : weightUnits;
      r = (n * table[from].toBase) / table[to].toBase;
    }
    out = String(Math.round(r * 1e6) / 1e6);
  }

  const select = (val: string, set: (v: string) => void) => (
    <select value={val} onChange={(e) => set(e.target.value)} className="rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle}>
      {options.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
    </select>
  );

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['length', 'weight', 'temp'] as const).map((k) => (
          <button
            key={k}
            onClick={() => switchKind(k)}
            className="px-3 py-1.5 rounded-lg text-xs capitalize"
            style={kind === k ? accentBtn : plainBtn}
          >
            {k === 'temp' ? 'Temperature' : k}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="w-28 rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} />
        {select(from, setFrom)}
        <span style={{ color: 'var(--text-dim)' }}>→</span>
        {select(to, setTo)}
      </div>
      <p className="text-2xl font-mono font-bold mt-4" style={{ color: 'var(--accent)' }}>{out || '—'}</p>
    </div>
  );
}

/* ---------- Word counter ---------- */

function WordCounter() {
  const [text, setText] = useState('');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length;
  const stats: [string, string | number][] = [
    ['Words', words],
    ['Characters', text.length],
    ['No spaces', text.replace(/\s/g, '').length],
    ['Sentences', sentences],
    ['Reading time', `${Math.max(words ? 1 : 0, Math.round(words / 200))} min`],
  ];
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
        {stats.map(([label, v]) => (
          <div key={label} className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>{v}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{label}</p>
          </div>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste or type text here..."
        rows={8}
        className="w-full rounded-lg p-3 text-sm outline-none resize-y"
        style={inputStyle}
      />
    </div>
  );
}

/* ---------- Lookalike text ---------- */

function LookalikeText() {
  const { settings, update } = useSettings();
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const output = mode === 'encode' ? toLookalike(input) : fromLookalike(input);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be blocked in iframes
    }
  };

  return (
    <div>
      <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-dim)' }}>
        Swaps normal letters for characters that look almost identical, like an "e" from another alphabet.
      </p>

      <div className="flex gap-2 mb-3">
        <button onClick={() => setMode('encode')} className="px-3 py-1.5 rounded-lg text-xs" style={mode === 'encode' ? accentBtn : plainBtn}>
          Normal → Lookalike
        </button>
        <button onClick={() => setMode('decode')} className="px-3 py-1.5 rounded-lg text-xs" style={mode === 'decode' ? accentBtn : plainBtn}>
          Lookalike → Normal
        </button>
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={mode === 'encode' ? 'Type or paste normal text...' : 'Paste lookalike text...'}
        rows={4}
        className="w-full rounded-lg p-3 text-sm outline-none resize-y mb-3"
        style={inputStyle}
      />

      <div className="flex items-center justify-between mb-1">
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Result</p>
        <button onClick={copy} disabled={!output} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs" style={plainBtn}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <textarea readOnly value={output} rows={4} className="w-full rounded-lg p-3 text-sm outline-none resize-y" style={inputStyle} />

      <label className="flex items-start gap-2 text-xs mt-4 cursor-pointer" style={{ color: 'var(--text-dim)' }}>
        <input
          type="checkbox"
          className="mt-0.5"
          checked={settings.lookalikeText}
          onChange={(e) => update({ lookalikeText: e.target.checked })}
        />
        <span>Use lookalike text across the whole site (the SecretV4 title stays normal)</span>
      </label>
    </div>
  );
}

/* ---------- Tool list (shown as cards in the Tools tab) ---------- */

export interface InSiteTool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  view: () => JSX.Element;
}

export const inSiteTools: InSiteTool[] = [
  { id: 'calculator', name: 'Calculator', description: 'Quick math, type or tap', icon: CalcIcon, view: Calculator },
  { id: 'timer', name: 'Timer & Stopwatch', description: 'Countdown and stopwatch', icon: Timer, view: TimerTools },
  { id: 'notes', name: 'Notes', description: 'Auto-saving scratchpad', icon: StickyNote, view: Notes },
  { id: 'password', name: 'Password Generator', description: 'Strong random passwords', icon: KeyRound, view: PasswordGenerator },
  { id: 'units', name: 'Unit Converter', description: 'Length, weight, temperature', icon: ArrowLeftRight, view: UnitConverter },
  { id: 'words', name: 'Word Counter', description: 'Words, characters, reading time', icon: Type, view: WordCounter },
  { id: 'lookalike', name: 'Lookalike Text', description: 'Swap letters for similar-looking characters', icon: Languages, view: LookalikeText },
];
