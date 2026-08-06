import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Loader2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { monteCarlo } from '../api';
import LevelSelector from './LevelSelector';
import HarnessConfigPanel from './HarnessConfig';
import LoopConfigPanel from './LoopConfig';
import TokenBudget from './TokenBudget';
import SuccessGauge from './SuccessGauge';

export default function FactoryView() {
  const { t } = useTranslation();
  const { blueprint, setMonteCarloResult, setLatestTrace } = useGame();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const result = await monteCarlo(blueprint, 100);
      setMonteCarloResult(result);
      if (result.sample_traces.length > 0) {
        setLatestTrace(result.sample_traces[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('factory.simulationFailed'));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <LevelSelector />
        </div>

        <div className="lg:col-span-1 space-y-6">
          <HarnessConfigPanel />
          <LoopConfigPanel />

          {error && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            onClick={handleRun}
            disabled={running}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-500 text-white font-medium transition-colors"
          >
            {running ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {t('factory.runningMonteCarlo')}
              </>
            ) : (
              <>
                <Play size={18} />
                {t('factory.runSimulation')}
              </>
            )}
          </button>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-6">
            <TokenBudget />
            <SuccessGauge />
          </div>
        </div>
      </div>
    </div>
  );
}
