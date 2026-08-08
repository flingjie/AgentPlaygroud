import type { Hypothesis } from '../../content/schema';
import { usePick } from '../../i18n/I18nProvider';
import { ui } from '../../i18n/uiStrings';

export interface HypothesisPanelProps {
  hypotheses: Hypothesis[];
  selectedId: string | null;
  confirmed: boolean;
  onSelect: (id: string) => void;
  onConfirm: () => void;
}

export function HypothesisPanel({
  hypotheses,
  selectedId,
  confirmed,
  onSelect,
  onConfirm,
}: HypothesisPanelProps) {
  const pick = usePick();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {pick(ui.diagnosePrompt)}
      </h3>

      <div className="space-y-2">
        {hypotheses.map((h) => {
          const isSelected = selectedId === h.id;
          return (
            <label
              key={h.id}
              data-testid={`hypothesis-option-${h.id}`}
              className={`flex items-start gap-3 rounded-lg border p-3 transition cursor-pointer ${
                isSelected
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
              }`}
            >
              <input
                type="radio"
                name="hypothesis"
                value={h.id}
                checked={isSelected}
                disabled={confirmed}
                onChange={() => onSelect(h.id)}
                className="mt-1 h-4 w-4 accent-sky-600"
              />
              <div className="flex-1">
                <span className="text-zinc-900 dark:text-zinc-100">{pick(h.text)}</span>
                {isSelected && (
                  <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {pick(h.feedback)}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>

      <button
        type="button"
        data-testid="confirm-diagnosis"
        disabled={!selectedId || confirmed}
        onClick={onConfirm}
        className="inline-flex items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pick(ui.confirmDiagnosis)}
      </button>
    </div>
  );
}
