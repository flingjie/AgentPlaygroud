import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import type { HarnessConfig } from '../types';

const TOGGLES: {
  key: keyof HarnessConfig;
  labelKey: string;
  descKey: string;
  unlockKey: string;
}[] = [
  { key: 'has_tool_registry', labelKey: 'harness.toolRegistry', descKey: 'harness.toolRegistryDesc', unlockKey: 'tool_registry' },
  { key: 'has_retry_policy', labelKey: 'harness.retryPolicy', descKey: 'harness.retryPolicyDesc', unlockKey: 'retry_policy' },
  { key: 'has_timeout_guard', labelKey: 'harness.timeoutGuard', descKey: 'harness.timeoutGuardDesc', unlockKey: 'timeout_guard' },
  { key: 'has_sandbox_isolation', labelKey: 'harness.sandboxIsolation', descKey: 'harness.sandboxIsolationDesc', unlockKey: 'sandbox_isolation' },
  { key: 'has_context_manager', labelKey: 'harness.contextManager', descKey: 'harness.contextManagerDesc', unlockKey: 'context_manager' },
  { key: 'has_state_persistence', labelKey: 'harness.statePersistence', descKey: 'harness.statePersistenceDesc', unlockKey: 'state_persistence' },
  { key: 'has_permission_layer', labelKey: 'harness.permissionLayer', descKey: 'harness.permissionLayerDesc', unlockKey: 'permission_layer' },
];

export default function HarnessConfigPanel() {
  const { t } = useTranslation();
  const { blueprint, updateHarness, selectedLevel } = useGame();
  const { harness } = blueprint;

  const unlocked = selectedLevel?.unlocked_harness ?? [];
  const memoryUnlocked = unlocked.length > 0;

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('harness.title')}
      </h3>

      <div className="grid grid-cols-1 gap-2">
        {TOGGLES.map(({ key, labelKey, descKey, unlockKey }) => {
          const isUnlocked = unlocked.includes(unlockKey);
          const enabled = harness[key] as boolean;

          return (
            <button
              key={key}
              disabled={!isUnlocked}
              onClick={() => {
                const next = !enabled;
                if (key === 'has_timeout_guard' && !next) {
                  updateHarness({ has_timeout_guard: false, run_boundary_cap: null });
                } else {
                  updateHarness({ [key]: next });
                }
              }}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                !isUnlocked
                  ? 'border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30 opacity-40 cursor-not-allowed'
                  : enabled
                    ? 'border-green-500/30 bg-green-400/5'
                    : 'border-gray-300 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  !isUnlocked
                    ? 'border-gray-300 dark:border-gray-700'
                    : enabled
                      ? 'border-green-400 bg-green-400'
                      : 'border-gray-400 dark:border-gray-600'
                }`}
              >
                {enabled && (
                  <svg
                    className="w-3 h-3 text-white dark:text-gray-900"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <span
                  className={`text-sm font-medium ${
                    !isUnlocked
                      ? 'text-gray-400 dark:text-gray-600'
                      : enabled
                        ? 'text-green-600 dark:text-green-300'
                        : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t(labelKey)}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t(descKey)}</p>
              </div>
              {!isUnlocked && (
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-600">{t('common.locked')}</span>
              )}
            </button>
          );
        })}
      </div>

      {harness.has_timeout_guard && unlocked.includes('timeout_guard') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {t('harness.runBoundaryCap')}
            </label>
            <span className="font-mono text-sm text-green-600 dark:text-green-400">
              {harness.run_boundary_cap ?? '—'}
            </span>
          </div>
          <input
            type="number"
            min={1000}
            step={1000}
            value={harness.run_boundary_cap ?? ''}
            placeholder={t('harness.runBoundaryCapPlaceholder')}
            onChange={(e) => {
              const raw = e.target.value;
              updateHarness({
                run_boundary_cap: raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0),
              });
            }}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-200 font-mono focus:outline-none focus:border-green-500"
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">
            {t('harness.memoryCapacity')}
          </label>
          <span className="font-mono text-sm text-green-600 dark:text-green-400">
            {harness.memory_capacity}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={harness.memory_capacity}
          disabled={!memoryUnlocked}
          onChange={(e) =>
            updateHarness({ memory_capacity: parseInt(e.target.value) })
          }
          className="w-full h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-green-400 disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-600 font-mono">
          <span>1</span>
          <span>10</span>
        </div>
      </div>
    </div>
  );
}
