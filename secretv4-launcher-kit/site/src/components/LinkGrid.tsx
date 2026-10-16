import { ExternalLink } from 'lucide-react';
import type { SiteLink } from '@/data/links';

export function LinkGrid({ links }: { links: SiteLink[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="game-card flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all duration-200"
          style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          <span className="truncate">{link.name}</span>
          <ExternalLink size={13} className="flex-shrink-0" style={{ color: 'var(--accent)' }} />
        </a>
      ))}
    </div>
  );
}
