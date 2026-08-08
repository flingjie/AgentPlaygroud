import type { Intervention } from '../../content/schema';
import { usePick } from '../../i18n/I18nProvider';
import { ui } from '../../i18n/uiStrings';

export interface InterventionPanelProps {
  interventions: Intervention[];
  selectedIds: Set<string>;
  paramValues: Record<string, number>;
  onToggle: (id: string) => void;
  onParamChange: (key: string, value: number) => void;
}

export function InterventionPanel({
  interventions,
  selectedIds,
  paramValues,
  onToggle,
  onParamChange,
}: InterventionPanelProps) {
  const pick = usePick();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {pick(ui.chooseFix)}
      </h3>

      <div className="space-y-2">
        {interventions.map((i) => {
          const selected = selectedIds.has(i.id);
          return (
            <div
              key={i.id}
              data-testid={`intervention-card-${i.id}`}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3"
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(i.id)}
                  className="mt-1 h-4 w-4 accent-sky-600"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {pick(i.name)}
                    </span>
                    {!i.isOptimal && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                        {pick(ui.suboptimal)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {pick(i.description)}
                  </p>
                </div>
              </label>

              {selected && (
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">
                      {pick(ui.configDiff)}
                    </div>
                    <pre className="overflow-x-auto text-xs whitespace-pre-wrap rounded bg-zinc-100 dark:bg-zinc-900 p-2 text-zinc-800 dark:text-zinc-200">
                      {pick(i.configDiff)}
                    </pre>
                  </div>

                  {i.parameters.length > 0 && (
                    <div className="space-y-2">
                      {i.parameters.map((p) => {
                        const key = `${i.id}.${p.key}`;
                        const value = paramValues[key] ?? p.defaultValue;
                        return (
                          <div key={key}>
                            <label className="flex justify-between text-sm text-zinc-700 dark:text-zinc-300">
                              <span>{pick(p.label)}</span>
                              <span className="font-mono">{value}</span>
                            </label>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="range"
                                min={p.min}
                                max={p.max}
                                step={p.step}
                                value={value}
                                onChange={(e) => onParamChange(key, Number(e.target.value))}
                                data-testid={`param-range-${key}`}
                                className="flex-1 accent-sky-600"
                              />
                              <input
                                type="number"
                                min={p.min}
                                max={p.max}
                                step={p.step}
                                value={value}
                                onChange={(e) => onParamChange(key, Number(e.target.value))}
                                data-testid={`param-number-${key}`}
                                className="w-20 rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-sm bg-white dark:bg-zinc-900"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {pick(i.tradeoff)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
