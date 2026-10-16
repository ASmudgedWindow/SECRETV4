import { Check, Palette, Shield, AlertTriangle, Type, Image, HardDrive } from 'lucide-react';
import { themes } from '@/data/themes';
import { backgrounds } from '@/data/backgrounds';
import type { Settings } from '@/hooks/useSettings';

interface SettingsTabProps {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

export function SettingsTab({ settings, update }: SettingsTabProps) {
  return (
    <div className="h-full overflow-y-auto -mr-2 pr-2">
      <div className="space-y-5">
        {/* Themes */}
        <div className="rounded-xl border p-5 animate-slide-up" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <Palette size={18} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Themes</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {themes.map((theme) => {
              const active = settings.themeId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => update({ themeId: theme.id })}
                  className="relative rounded-lg border p-3 transition-all duration-200"
                  style={{
                    background: theme.colors.bgSecondary,
                    borderColor: active ? theme.colors.accent : 'var(--border)',
                    boxShadow: active ? `0 0 12px ${theme.colors.accentGlow}` : 'none',
                  }}
                >
                  {active && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: theme.colors.accent }}
                    >
                      <Check size={12} style={{ color: theme.colors.bg }} />
                    </div>
                  )}
                  <div className="flex gap-1.5 mb-2">
                    <div className="w-6 h-6 rounded" style={{ background: theme.colors.accent }} />
                    <div className="w-6 h-6 rounded" style={{ background: theme.colors.bgTertiary, border: `1px solid ${theme.colors.border}` }} />
                    <div className="w-6 h-6 rounded" style={{ background: theme.colors.accentSecondary }} />
                  </div>
                  <p className="text-xs font-medium" style={{ color: theme.colors.text }}>
                    {theme.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Background */}
        <div className="rounded-xl border p-5 animate-slide-up" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', animationDelay: '30ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <Image size={18} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Background</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {backgrounds.map((bg) => {
              const active = settings.background === bg.id;
              return (
                <button
                  key={bg.id}
                  onClick={() => update({ background: bg.id })}
                  className="relative rounded-lg border p-3 text-left transition-all duration-200"
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                    boxShadow: active ? '0 0 12px var(--accent-glow)' : 'none',
                  }}
                >
                  {active && (
                    <div
                      className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--accent)' }}
                    >
                      <Check size={12} style={{ color: 'var(--bg)' }} />
                    </div>
                  )}
                  <bg.icon size={18} className="mb-2" style={{ color: 'var(--accent)' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{bg.name}</p>
                  <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-dim)' }}>{bg.description}</p>
                </button>
              );
            })}
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>Panel opacity</p>
              <p className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{Math.round(settings.panelOpacity * 100)}%</p>
            </div>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={settings.panelOpacity}
              onChange={(e) => update({ panelOpacity: Number(e.target.value) })}
              className="w-full"
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>
              Lower shows more of the background through cards and panels.
            </p>
          </div>
        </div>

        {/* Cloaking options */}
        <div className="rounded-xl border p-5 animate-slide-up" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', animationDelay: '60ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <Shield size={18} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Cloaking</h3>
          </div>
          <div className="space-y-3">
            {/* About:Blank */}
            <ToggleRow
              title="About:Blank Cloaking"
              description="Opens this site inside an about:blank tab and redirects the original tab to Google"
              value={settings.aboutBlankCloaking}
              onChange={(v) => update({ aboutBlankCloaking: v })}
            />
            {/* Close warning */}
            <ToggleRow
              title="Close Tab Warning"
              description="Shows a confirmation dialog when you try to close the tab"
              value={settings.closeWarning}
              onChange={(v) => update({ closeWarning: v })}
            />
          </div>
        </div>

        {/* Lookalike text */}
        <div className="rounded-xl border p-5 animate-slide-up" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', animationDelay: '90ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <Type size={18} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Text</h3>
          </div>
          <ToggleRow
            title="Lookalike Text"
            description="Swaps letters across the whole site for characters that look the same (the SecretV4 title stays normal)"
            value={settings.lookalikeText}
            onChange={(v) => update({ lookalikeText: v })}
          />
        </div>

        {/* Games */}
        <div className="rounded-xl border p-5 animate-slide-up" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', animationDelay: '105ms' }}>
          <div className="flex items-center gap-3 mb-4">
            <HardDrive size={18} style={{ color: 'var(--accent)' }} />
            <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>Games</h3>
          </div>
          <ToggleRow
            title="Google Drive Links Only"
            description="Off (default): games play right here on SecretV4. On: games never play here, they open as Google Drive links so you can download them."
            value={settings.driveLinksOnly}
            onChange={(v) => update({ driveLinksOnly: v })}
          />
        </div>

        {/* Warning notice */}
        <div
          className="rounded-xl border p-4 flex items-start gap-3 animate-slide-up"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            animationDelay: '120ms',
          }}
        >
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            About:Blank cloaking applies on the next page load. Close protection works while enabled. Some browsers may block popups, which prevents cloaking from working.
          </p>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-lg border p-3"
      style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="no-fx relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
        style={{
          background: value ? 'var(--accent)' : 'var(--border)',
          boxShadow: value ? `0 0 8px var(--accent-glow)` : 'none',
        }}
      >
        <div
          className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
          style={{
            left: value ? '22px' : '2px',
            background: value ? 'var(--bg)' : 'var(--text-dim)',
          }}
        />
      </button>
    </div>
  );
}
