import { useState } from 'react';
import type { XRayIteration } from '../../content/schema';
import { usePick } from '../../i18n/I18nProvider';
import { ui } from '../../i18n/uiStrings';

export interface XRayTimelineProps {
  iterations: XRayIteration[];
  initialStep?: number;
}

export function XRayTimeline({ iterations, initialStep = 1 }: XRayTimelineProps) {
  const pick = usePick();
  const [selectedStep, setSelectedStep] = useState(initialStep);
  const current = iterations.find((i) => i.step === selectedStep) ?? iterations[0] ?? null;

  if (!current) return null;

  const layer = (label: string, children: React.ReactNode) => (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
        {label}
      </div>
      <div className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{children}</div>
    </div>
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {pick(ui.xrayTitle)}
      </h3>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {iterations.map((i) => (
          <button
            key={i.step}
            type="button"
            data-testid={`xray-step-${i.step}`}
            onClick={() => setSelectedStep(i.step)}
            className={`min-w-[2.5rem] rounded-lg px-3 py-2 text-sm font-medium transition ${
              selectedStep === i.step
                ? 'bg-sky-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
          >
            {i.step}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {layer(
          `${pick(ui.context)} · ${current.context.usagePercent}%`,
          pick(current.context.content),
        )}
        {layer(
          `${pick(ui.prompt)} · ${current.prompt.tokens} tokens`,
          pick(current.prompt.content),
        )}
        {layer(
          `${pick(ui.decision)} · ${pick(ui.confidence)} ${current.decision.confidence}`,
          pick(current.decision.content),
        )}
        {layer(
          pick(ui.tools),
          current.toolCalls.length > 0
            ? current.toolCalls
                .map((tc) => `${tc.name}(${tc.args}) → ${tc.result ?? 'null'}`)
                .join('\n')
            : '-',
        )}
        {layer(
          pick(ui.observation),
          current.observation ? pick(current.observation) : '-',
        )}
        {layer(
          pick(ui.memory),
          [...current.memory.shortTerm.map(pick), ...current.memory.longTerm.map(pick)].join('\n') || '-',
        )}
        {layer(pick(ui.nextAction), pick(current.nextAction))}
        {current.annotations.length > 0 &&
          layer(
            pick(ui.annotations),
            current.annotations
              .map((a) => `[${a.severity}] ${pick(a.text)}`)
              .join('\n'),
          )}
      </div>
    </div>
  );
}
