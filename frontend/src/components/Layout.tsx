import { useState } from 'react';
import {
  LayoutDashboard,
  GitGraph,
  Bug,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import FactoryView from './FactoryView';
import ArchitectCanvas from './ArchitectCanvas';
import Debugger from './Debugger';

type Tab = 'factory' | 'architect' | 'debugger';

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'factory', label: 'Factory', icon: LayoutDashboard },
  { id: 'architect', label: 'Architect', icon: GitGraph },
  { id: 'debugger', label: 'Debugger', icon: Bug },
];

export default function Layout() {
  const [activeTab, setActiveTab] = useState<Tab>('factory');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { selectedLevel } = useGame();

  const canAccessArchitect = selectedLevel?.unlocked_graph ?? false;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-200 ${
          sidebarCollapsed ? 'w-14' : 'w-56'
        }`}
      >
        {/* Logo area */}
        <div className="flex items-center h-14 px-3 border-b border-gray-800">
          {!sidebarCollapsed && (
            <span className="font-mono text-sm font-bold tracking-wider text-green-400">
              AGENT_FORGE
            </span>
          )}
        </div>

        {/* Tabs */}
        <nav className="flex-1 py-2 space-y-1 px-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const disabled = tab.id === 'architect' && !canAccessArchitect;
            return (
              <button
                key={tab.id}
                disabled={disabled}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-green-400'
                    : disabled
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
                title={disabled ? 'Unlock graph editing to access' : tab.label}
              >
                <Icon size={18} />
                {!sidebarCollapsed && (
                  <span>
                    {tab.label}
                    {disabled && (
                      <span className="ml-1 text-xs text-gray-600">🔒</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex items-center justify-center h-10 border-t border-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header bar */}
        <header className="flex items-center h-14 px-6 border-b border-gray-800 bg-gray-900/50 shrink-0">
          <h1 className="font-mono text-sm text-gray-400">
            <span className="text-green-400">
              {selectedLevel?.name ?? 'Loading...'}
            </span>
            <span className="mx-2 text-gray-700">|</span>
            {TABS.find((t) => t.id === activeTab)?.label}
          </h1>
        </header>

        {/* View area */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'factory' && <FactoryView />}
          {activeTab === 'architect' && canAccessArchitect && <ArchitectCanvas />}
          {activeTab === 'architect' && !canAccessArchitect && (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <GitGraph size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-mono text-sm">
                  Graph editing is locked for this level.
                </p>
                <p className="text-xs mt-1 text-gray-600">
                  Select a higher level to unlock the Architect.
                </p>
              </div>
            </div>
          )}
          {activeTab === 'debugger' && <Debugger />}
        </div>
      </main>
    </div>
  );
}
