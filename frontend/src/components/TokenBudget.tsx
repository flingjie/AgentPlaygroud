import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';

interface TokenBudgetProps {
  estimatedCost?: number;
}

export default function TokenBudget({ estimatedCost }: TokenBudgetProps) {
  const { t } = useTranslation();
  const { selectedLevel, monteCarloResult } = useGame();
  const budget = selectedLevel?.token_budget ?? 1000;
  const used = monteCarloResult?.avg_tokens ?? estimatedCost ?? 0;
  const pct = Math.min((used / budget) * 100, 100);
  const overBudget = used > budget;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('tokenBudget.title')}
        </h3>
        <span
          className={`font-mono text-sm ${
            overBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
          }`}
        >
          {used.toLocaleString()} / {budget.toLocaleString()}
        </span>
      </div>
      <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            overBudget
              ? 'bg-red-500 dark:bg-red-400'
              : pct > 80
                ? 'bg-yellow-500 dark:bg-yellow-400'
                : 'bg-green-500 dark:bg-green-400'
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {overBudget && (
        <p className="text-xs text-red-600 dark:text-red-400 font-mono">
          {t('tokenBudget.overBudget', { amount: (used - budget).toLocaleString() })}
        </p>
      )}
    </div>
  );
}
