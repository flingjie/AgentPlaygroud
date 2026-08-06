import { useTranslation } from 'react-i18next';
import { useGame, successRatePct } from '../context/GameContext';
import StaticFlowDiagram from './StaticFlowDiagram';

export default function LevelSelector() {
  const { t } = useTranslation();
  const {
    levels,
    levelsLoading,
    levelsError,
    selectedLevelId,
    setSelectedLevelId,
    selectedLevel,
    monteCarloResult,
  } = useGame();

  // snake_case level key -> camelCase i18n key under harness.*
  const harnessLabelKeys: Record<string, string> = {
    tool_registry: 'harness.toolRegistry',
    retry_policy: 'harness.retryPolicy',
    timeout_guard: 'harness.timeoutGuard',
    sandbox_isolation: 'harness.sandboxIsolation',
    context_manager: 'harness.contextManager',
    state_persistence: 'harness.statePersistence',
    permission_layer: 'harness.permissionLayer',
  };

  const targetPct = (rate: number) => (rate <= 1 ? rate * 100 : rate);

  const currentSuccessRate = monteCarloResult
    ? successRatePct(monteCarloResult.success_rate)
    : null;

  return (
    <div className="space-y-3">
      <label className="block font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('levelSelector.selectLevel')}
      </label>

      {levelsLoading && (
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-green-400 rounded-full animate-spin" />
          {t('levelSelector.loadingLevels')}
        </div>
      )}

      {levelsError && (
        <div className="text-red-600 dark:text-red-400 text-sm bg-red-400/10 rounded-lg p-3 border border-red-400/20">
          {levelsError}
          <button
            onClick={() => window.location.reload()}
            className="block mt-1 text-xs text-red-600 dark:text-red-300 underline"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {!levelsLoading && !levelsError && levels.length === 0 && (
        <p className="text-gray-400 dark:text-gray-500 text-sm">
          {t('levelSelector.noLevels')}
        </p>
      )}

      {!levelsLoading && !levelsError && levels.length > 0 && (
        <>
          <select
            value={selectedLevelId}
            onChange={(e) => setSelectedLevelId(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-200 font-mono focus:outline-none focus:border-green-500 transition-colors"
          >
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} — {l.learning_label}
              </option>
            ))}
          </select>

          {selectedLevel && (
            <div className="bg-gray-100/50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2 border border-gray-200/50 dark:border-gray-700/50">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {t(
                  `levels.${selectedLevel.id}.description`,
                  selectedLevel.description,
                )}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-green-400/10 text-green-600 dark:text-green-400 border border-green-400/20">
                  {t('levelSelector.target')}:{' '}
                  {Math.round(targetPct(selectedLevel.target_success_rate))}%
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-blue-400/10 text-blue-600 dark:text-blue-400 border border-blue-400/20">
                  {t('levelSelector.budget')}:{' '}
                  {selectedLevel.token_budget.toLocaleString()}{' '}
                  {t('levelSelector.tokens')}
                </span>
                {currentSuccessRate != null && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 border border-yellow-400/20">
                    {t('levelSelector.current')}: {Math.round(currentSuccessRate)}%
                  </span>
                )}
              </div>
              <div className="pt-1">
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                  {t('levelSelector.unlocked')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedLevel.unlocked_harness.map((h) => (
                    <span
                      key={h}
                      className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono"
                    >
                      {t(harnessLabelKeys[h] ?? h)}
                    </span>
                  ))}
                  {selectedLevel.unlocked_loop && (
                    <span className="px-2 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-700/50 text-purple-700 dark:text-purple-300 font-mono">
                      {t('levelSelector.loop')}
                    </span>
                  )}
                  {selectedLevel.unlocked_graph && (
                    <span className="px-2 py-0.5 rounded text-xs bg-orange-100 dark:bg-orange-700/50 text-orange-700 dark:text-orange-300 font-mono">
                      {t('levelSelector.graph')}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
                  {t(`levels.${selectedLevel.id}.tutorial`, '')}
                </p>
              </div>

              <StaticFlowDiagram />
            </div>
          )}
        </>
      )}
    </div>
  );
}
