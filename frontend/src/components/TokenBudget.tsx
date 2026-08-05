import { useGame } from '../context/GameContext';

interface TokenBudgetProps {
  estimatedCost?: number;
}

export default function TokenBudget({ estimatedCost }: TokenBudgetProps) {
  const { selectedLevel, monteCarloResult } = useGame();
  const budget = selectedLevel?.token_budget ?? 1000;
  const used = monteCarloResult?.avg_tokens ?? estimatedCost ?? 0;
  const pct = Math.min((used / budget) * 100, 100);
  const overBudget = used > budget;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs text-gray-400 uppercase tracking-wider">
          Token Budget
        </h3>
        <span
          className={`font-mono text-sm ${
            overBudget ? 'text-red-400' : 'text-green-400'
          }`}
        >
          {used.toLocaleString()} / {budget.toLocaleString()}
        </span>
      </div>
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            overBudget
              ? 'bg-red-400'
              : pct > 80
                ? 'bg-yellow-400'
                : 'bg-green-400'
          }`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {overBudget && (
        <p className="text-xs text-red-400 font-mono">
          Over budget by {((used - budget)).toLocaleString()} tokens
        </p>
      )}
    </div>
  );
}
