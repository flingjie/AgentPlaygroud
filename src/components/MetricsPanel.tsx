import { SuccessGauge } from './SuccessGauge';
import { usePick } from '../i18n/I18nProvider';
import { ui } from '../i18n/uiStrings';
import type { MonteCarloSummary } from '../engine/simulator';
import type { FailureId } from '../content/schema';

export interface MetricsPanelProps {
  baseline: MonteCarloSummary | null;
  current: MonteCarloSummary | null;
}

export function MetricsPanel({ baseline, current }: MetricsPanelProps) {
  const pick = usePick();

  if (!baseline && !current) return null;

  const summary = current ?? baseline;
  const failures = Object.entries(summary!.failureBreakdown) as [FailureId, number][];

  return (
    <div className="space-y-4">
      <div className={baseline && current ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1 gap-4'}>
        {baseline && current && (
          <>
            <SuccessGauge
              value={baseline.successRate}
              label={pick(ui.baseline)}
              accentClassName="text-zinc-500"
            />
            <SuccessGauge
              value={current.successRate}
              label={pick(ui.improved)}
              accentClassName="text-emerald-500"
            />
          </>
        )}
        {current && !baseline && (
          <SuccessGauge
            value={current.successRate}
            label={pick(ui.improved)}
            accentClassName="text-sky-500"
          />
        )}
        {baseline && !current && (
          <SuccessGauge
            value={baseline.successRate}
            label={pick(ui.baseline)}
            accentClassName="text-zinc-500"
          />
        )}
      </div>

      <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
        <div>
          {pick(ui.tokenCost)}: {summary!.avgTokenCost}
        </div>
        <div>
          {summary!.trials} {pick(ui.trials)}
        </div>
      </div>

      {failures.length > 0 && (
        <div className="space-y-2">
          {failures.map(([id, count]) => {
            const width = (count / summary!.trials) * 100;
            return (
              <div key={id}>
                <div className="flex justify-between text-xs mb-1 text-zinc-700 dark:text-zinc-300">
                  <span>{id}</span>
                  <span>{count}</span>
                </div>
                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
