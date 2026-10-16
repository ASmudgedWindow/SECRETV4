import type { LucideIcon } from 'lucide-react';

export interface SubTab<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  /** Gold styling, used for the Featured tab */
  gold?: boolean;
}

interface SubTabsProps<T extends string> {
  tabs: SubTab<T>[];
  active: T;
  onChange: (id: T) => void;
}

export function SubTabs<T extends string>({ tabs, active, onChange }: SubTabsProps<T>) {
  return (
    <div className="flex-shrink-0 mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const color = tab.gold ? 'var(--gold)' : 'var(--accent)';
        const glow = tab.gold ? 'var(--gold-glow)' : 'var(--accent-glow)';
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: isActive ? color : tab.gold ? 'rgba(255, 200, 61, 0.08)' : 'var(--bg-secondary)',
              color: isActive ? 'var(--bg)' : tab.gold ? 'var(--gold)' : 'var(--text-dim)',
              border: `1px solid ${isActive || tab.gold ? color : 'var(--border)'}`,
              boxShadow: isActive || tab.gold ? `0 0 12px ${glow}` : 'none',
            }}
          >
            {tab.icon && <tab.icon size={15} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
