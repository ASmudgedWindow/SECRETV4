import { useState } from 'react';
import { Info, Coffee } from 'lucide-react';
import { SubTabs, type SubTab } from '@/components/SubTabs';
import { BoredSection } from '@/components/bored/BoredSection';
import { libraryGames } from '@/data/gameLibrary';

function AboutSection() {
  return (
    <div>
      <div className="space-y-4">
        {/* About card */}
        <div
          className="rounded-xl border p-6 animate-slide-up"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
            >
              <Info size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="text-lg font-medium" style={{ color: 'var(--text)' }}>
              About SecretV4
            </h3>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            SecretV4 is a sci-fi hub for accessing a collection of games and utilities. Built with a focus on
            a sleek, cyberpunk-inspired interface with customizable dark themes and cloaking features.
          </p>
        </div>

        {/* Stats card */}
        <div
          className="rounded-xl border p-6 animate-slide-up"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', animationDelay: '60ms' }}
        >
          <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text)' }}>
            Collection Stats
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Games', value: String(libraryGames.length) },
              { label: 'Themes', value: '8' },
              { label: 'Tabs', value: '4' },
              { label: 'Tools', value: '9' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border p-3 text-center"
                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
              >
                <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                  {stat.value}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Version card */}
        <div
          className="rounded-xl border p-6 animate-slide-up"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', animationDelay: '120ms' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                Version
              </p>
              <p className="text-lg font-mono font-bold mt-1" style={{ color: 'var(--accent)' }}>
                v4.0.0
              </p>
            </div>
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
            >
              Stable
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type StuffSection = 'about' | 'bored';

const sections: SubTab<StuffSection>[] = [
  { id: 'about', label: 'About', icon: Info },
  { id: 'bored', label: 'Bored', icon: Coffee },
];

export function StuffTab() {
  const [section, setSection] = useState<StuffSection>('about');
  return (
    <div className="h-full flex flex-col">
      <SubTabs tabs={sections} active={section} onChange={setSection} />
      <div className="flex-1 overflow-y-auto -mr-2 pr-2">
        {section === 'about' ? <AboutSection /> : <BoredSection />}
      </div>
    </div>
  );
}
