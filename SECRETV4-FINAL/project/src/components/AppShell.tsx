import { useState, useEffect } from 'react';
import { Gamepad2, Wrench, Package, Settings as SettingsIcon, Search } from 'lucide-react';
import { GamesTab } from '@/components/tabs/GamesTab';
import { ToolsTab } from '@/components/tabs/ToolsTab';
import { StuffTab } from '@/components/tabs/StuffTab';
import { SettingsTab } from '@/components/tabs/SettingsTab';
import { useSettings } from '@/hooks/useSettings';
import { libraryGames } from '@/data/gameLibrary';
import { GameLaunchProvider } from '@/components/GameLaunchProvider';
import { useClickRipple } from '@/hooks/useClickRipple';

type TabId = 'games' | 'tools' | 'stuff' | 'settings';

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof Gamepad2;
}

const navItems: NavItem[] = [
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'stuff', label: 'Stuff', icon: Package },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>('games');
  const { settings, update, theme } = useSettings();
  useClickRipple();

  // Close tab warning
  useEffect(() => {
    if (!settings.closeWarning) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Changes may not be saved.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [settings.closeWarning]);

  return (
    <GameLaunchProvider>
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              boxShadow: `0 0 12px var(--accent-glow)`,
            }}
          >
            <Gamepad2 size={18} style={{ color: 'var(--accent)' }} />
          </div>
          <h1
            data-no-translate
            className="text-lg font-bold tracking-wider"
            style={{
              color: 'var(--text)',
              textShadow: `0 0 12px var(--accent-glow)`,
            }}
          >
            SecretV4
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            <Search size={14} style={{ color: 'var(--text-dim)' }} />
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
              {libraryGames.length} games
            </span>
          </div>
          <div
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-dim)',
            }}
          >
            {theme.name}
          </div>
        </div>
      </header>

      {/* Main content + sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <nav
          className="flex-shrink-0 w-14 sm:w-52 border-r flex flex-col py-3"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="flex items-center gap-3 mx-2 my-0.5 px-3 py-2.5 rounded-lg transition-all duration-150"
                style={{
                  background: active ? 'var(--bg-tertiary)' : 'transparent',
                  border: active ? `1px solid var(--accent)` : '1px solid transparent',
                  boxShadow: active ? `0 0 12px var(--accent-glow)` : 'none',
                }}
              >
                <item.icon
                  size={20}
                  className="flex-shrink-0"
                  style={{ color: active ? 'var(--accent)' : 'var(--text-dim)' }}
                />
                <span
                  className="text-sm font-medium hidden sm:block"
                  style={{ color: active ? 'var(--text)' : 'var(--text-dim)' }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          <div className="mt-auto mx-2 px-3 py-2 hidden sm:block">
            <div className="h-px mb-3" style={{ background: 'var(--border)' }} />
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              v4.0.0
            </p>
          </div>
        </nav>

        {/* Content area */}
        <main className="flex-1 overflow-hidden p-4 sm:p-6">
          <div className="h-full animate-fade-in" key={activeTab}>
            {activeTab === 'games' && <GamesTab />}
            {activeTab === 'tools' && <ToolsTab />}
            {activeTab === 'stuff' && <StuffTab />}
            {activeTab === 'settings' && <SettingsTab settings={settings} update={update} />}
          </div>
        </main>
      </div>
    </div>
    </GameLaunchProvider>
  );
}
