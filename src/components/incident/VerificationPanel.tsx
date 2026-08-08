import type { LocalizedText } from '../../content/schema';
import type { MonteCarloSummary } from '../../engine/simulator';
import { usePick } from '../../i18n/I18nProvider';
import { ui } from '../../i18n/uiStrings';
import { MetricsPanel } from '../MetricsPanel';

export interface VerificationPanelProps {
  baseline: MonteCarloSummary | null;
  current: MonteCarloSummary | null;
  retrospective: LocalizedText;
  canClose: boolean;
  onVerify: () => void;
  onClose: () => void;
}

export function VerificationPanel({
  baseline,
  current,
  retrospective,
  canClose,
  onVerify,
  onClose,
}: VerificationPanelProps) {
  const pick = usePick();

  return (
    <div className="space-y-4">
      <MetricsPanel baseline={baseline} current={current} />

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
          {pick(ui.retrospective)}
        </h4>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{pick(retrospective)}</p>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-2 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="flex gap-3">
          <button
            type="button"
            data-testid="verify-button"
            onClick={onVerify}
            className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            {pick(ui.verifyFix)}
          </button>
          <button
            type="button"
            data-testid="close-incident"
            disabled={!canClose}
            onClick={onClose}
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pick(ui.closeIncident)}
          </button>
        </div>
      </div>
    </div>
  );
}
