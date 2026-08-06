import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  GitGraph,
  Bug,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useTheme } from '../context/ThemeContext';
import FactoryView from './FactoryView';
import ArchitectCanvas from './ArchitectCanvas';
import Debugger from './Debugger';
import ExportView from './ExportView';

type Tab = 'factory' | 'architect' | 'debugger' | 'export';

const TABS: { id: Tab; i18nKey: string; icon: typeof LayoutDashboard }[] = [
  { id: 'factory', i18nKey: 'layout.factory', icon: LayoutDashboard },
  { id: 'architect', i18nKey: 'layout.architect', icon: GitGraph },
  { id: 'debugger', i18nKey: 'layout.debugger', icon: Bug },
  { id: 'export', i18nKey: 'layout.export', icon: FileCode2 },
];

const BOSS_LEVEL_ID = 'level_6_agent_system';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('factory');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { selectedLevel } = useGame();

  const canAccessArchitect = selectedLevel?.unlocked_graph ?? false;
  const isBossLevel = selectedLevel?.id === BOSS_LEVEL_ID;

  // Export tab only exists on the boss level; drop out of it if we leave.
  useEffect(() => {
    if (activeTab === 'export' && !isBossLevel) setActiveTab('factory');
  }, [activeTab, isBossLevel]);

  const visibleTabs = isBossLevel ? TABS : TABS.filter((tab) => tab.id !== 'export');

  const toggleLanguage = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ${
          sidebarCollapsed ? 'w-14' : 'w-56'
        }`}
      >
        {/* Logo area */}
        <div className="flex items-center h-14 px-3 border-b border-gray-200 dark:border-gray-800">
          {!sidebarCollapsed && (
            <span className="font-mono text-sm font-bold tracking-wider text-green-600 dark:text-green-400">
              {t('layout.brand')}
            </span>
          )}
        </div>

        {/* Tabs */}
        <nav className="flex-1 py-2 space-y-1 px-2">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const disabled = tab.id === 'architect' && !canAccessArchitect;
            return (
              <button
                key={tab.id}
                disabled={disabled}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-200 dark:bg-gray-800 text-green-600 dark:text-green-400'
                    : disabled
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
                }`}
                title={disabled ? t('layout.architectLocked') : t(tab.i18nKey)}
              >
                <Icon size={18} />
                {!sidebarCollapsed && (
                  <span>
                    {t(tab.i18nKey)}
                    {disabled && (
                      <span className="ml-1 text-xs text-gray-400 dark:text-gray-600">&#x1F512;</span>
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
          className="flex items-center justify-center h-10 border-t border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header bar */}
        <header className="flex items-center justify-between h-14 px-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
          <h1 className="font-mono text-sm text-gray-500 dark:text-gray-400">
            <span className="text-green-600 dark:text-green-400">
              {selectedLevel?.name ?? t('common.loading')}
            </span>
            <span className="mx-2 text-gray-300 dark:text-gray-700">|</span>
            {t(TABS.find((tab) => tab.id === activeTab)?.i18nKey ?? '')}
          </h1>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-medium bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={i18n.language === 'zh' ? t('common.switchToEnglish') : t('common.switchToChinese')}
            >
              {i18n.language === 'zh' ? 'EN' : '中文'}
            </button>
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={theme === 'dark' ? t('common.switchToLight') : t('common.switchToDark')}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </div>
        </header>

        {/* View area */}
        <div className="flex-1 overflow-auto bg-white dark:bg-gray-950">
          {activeTab === 'factory' && <FactoryView />}
          {activeTab === 'architect' && canAccessArchitect && <ArchitectCanvas />}
          {activeTab === 'architect' && !canAccessArchitect && (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <GitGraph size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-mono text-sm">
                  {t('layout.graphLocked')}
                </p>
                <p className="text-xs mt-1 text-gray-400 dark:text-gray-600">
                  {t('layout.graphLockedHint')}
                </p>
              </div>
            </div>
          )}
          {activeTab === 'debugger' && <Debugger />}
          {activeTab === 'export' && isBossLevel && <ExportView />}
        </div>
      </main>
    </div>
  );
}
