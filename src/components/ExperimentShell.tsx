import { useTranslation } from 'react-i18next';
import { Play, BarChart3 } from 'lucide-react';
import Sidebar from './Sidebar';
import { useExperimentStore } from '../stores/experimentStore';

const TABS = [
  { id: 'runtime' as const, labelKey: 'tabs.runtime' },
  { id: 'context' as const, labelKey: 'tabs.context' },
  { id: 'reality' as const, labelKey: 'tabs.reality' },
  { id: 'architecture' as const, labelKey: 'tabs.architecture' },
];

function TabPlaceholder({ name }: { name: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600 font-mono text-sm">
      {name} — coming in Phase 1
    </div>
  );
}

export default function ExperimentShell() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab, activeExperimentId } = useExperimentStore();

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            Agent Engineering Simulator
          </h1>
          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            2.0
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!activeExperimentId}
          >
            <Play size={14} />
            {t('shell.run')}
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <BarChart3 size={14} />
            Monte Carlo
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* ── Tabs ────────────────────────────────────────────── */}
          <nav className="h-10 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-1 shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </nav>

          {/* ── Tab content ─────────────────────────────────────── */}
          {activeTab === 'runtime' && <TabPlaceholder name="Agent Runtime Timeline" />}
          {activeTab === 'context' && <TabPlaceholder name="Context Inspector" />}
          {activeTab === 'reality' && <TabPlaceholder name="Reality Viewer" />}
          {activeTab === 'architecture' && <TabPlaceholder name="Architecture Canvas" />}
        </main>
      </div>
    </div>
  );
}
