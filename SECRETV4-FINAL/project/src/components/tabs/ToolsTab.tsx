import { useEffect, useState } from 'react';
import {
  Maximize,
  Clock,
  ExternalLink,
  Globe,
  Download,
  Link2,
  ImageOff,
  Shapes,
  RefreshCw,
  Wrench,
  Smile,
  EyeOff,
  type LucideIcon,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { inSiteTools, type InSiteTool } from '@/components/tools/UsefulTools';
import { usefulLinks } from '@/data/links';

const siteIcons: Record<string, LucideIcon> = {
  'Invisible Character': EyeOff,
  'YT Video Downloader': Download,
  'TinyURL (Link Shortener)': Link2,
  RemoveBG: ImageOff,
  'Lucide (Free Icons)': Shapes,
  'Universal File Converter': RefreshCw,
  'Simpletools.lol': Wrench,
  'Text Emojis and More': Smile,
};

const cardClass = 'game-card rounded-xl border p-5 text-left block animate-slide-up';
const cardStyle = (i: number) => ({
  background: 'var(--bg-secondary)',
  borderColor: 'var(--border)',
  animationDelay: `${i * 50}ms`,
});

function IconBox({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
    >
      <Icon size={20} style={{ color: 'var(--accent)' }} />
    </div>
  );
}

function SectionHeading({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} style={{ color: 'var(--accent)' }} />
      <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
        {children}
      </h3>
    </div>
  );
}

export function ToolsTab() {
  const [clockVisible, setClockVisible] = useState(false);
  const [openTool, setOpenTool] = useState<InSiteTool | null>(null);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  const cards: { key: string; name: string; description: string; icon: LucideIcon; onClick: () => void }[] = [
    { key: 'fullscreen', name: 'Fullscreen', description: 'Toggle fullscreen mode', icon: Maximize, onClick: toggleFullscreen },
    { key: 'clock', name: 'Clock', description: 'Toggle a live clock overlay', icon: Clock, onClick: () => setClockVisible((v) => !v) },
    ...inSiteTools.map((t) => ({
      key: t.id,
      name: t.name,
      description: t.description,
      icon: t.icon,
      onClick: () => setOpenTool(t),
    })),
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto -mr-2 pr-2 pb-4">
        <SectionHeading icon={Wrench}>Tools</SectionHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map((card, i) => (
            <button key={card.key} onClick={card.onClick} className={cardClass} style={cardStyle(i)}>
              <IconBox icon={card.icon} />
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {card.name}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                {card.description}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-7">
          <SectionHeading icon={Globe}>Handy Sites</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {usefulLinks.map((link, i) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClass}
                style={cardStyle(i)}
              >
                <div className="flex items-start justify-between">
                  <IconBox icon={siteIcons[link.name] ?? Globe} />
                  <ExternalLink size={14} style={{ color: 'var(--text-dim)' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {link.name}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                  {link.description}
                </p>
              </a>
            ))}
          </div>
        </div>

        <div
          className="mt-7 rounded-xl border p-5"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
            Quick Links
          </h3>
          <div className="flex flex-wrap gap-2 mt-3">
            {['https://www.google.com', 'https://www.youtube.com', 'https://github.com', 'https://stackoverflow.com'].map(
              (url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="game-card px-3 py-1.5 text-xs rounded-lg border transition-all"
                  style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}
                >
                  {url.replace('https://www.', '').replace('https://', '')}
                </a>
              ),
            )}
          </div>
        </div>
      </div>

      {openTool && (
        <Modal title={openTool.name} onClose={() => setOpenTool(null)} maxWidth="max-w-xl">
          <openTool.view />
        </Modal>
      )}

      {clockVisible && (
        <div
          className="fixed bottom-20 right-6 z-50 rounded-xl border p-4 animate-slide-up"
          style={{
            background: 'var(--panel)',
            borderColor: 'var(--accent)',
            boxShadow: `0 0 20px var(--accent-glow)`,
          }}
        >
          <ClockDisplay />
        </div>
      )}
    </div>
  );
}

function ClockDisplay() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="text-center">
      <p className="text-2xl font-mono font-bold" style={{ color: 'var(--accent)' }}>
        {time.toLocaleTimeString()}
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
        {time.toLocaleDateString()}
      </p>
    </div>
  );
}
