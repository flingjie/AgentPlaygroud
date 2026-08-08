import { useState } from 'react';
import type { Evidence } from '../../content/schema';
import { usePick } from '../../i18n/I18nProvider';
import { ui } from '../../i18n/uiStrings';

export interface EvidenceBoardProps {
  evidences: Evidence[];
  viewedIds: Set<string>;
  onView: (id: string) => void;
}

export function EvidenceBoard({ evidences, viewedIds, onView }: EvidenceBoardProps) {
  const pick = usePick();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!viewedIds.has(id)) onView(id);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {pick(ui.evidence)}
      </h3>
      <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
        {evidences.map((ev) => {
          const isExpanded = expanded.has(ev.id);
          return (
            <div
              key={ev.id}
              role="button"
              tabIndex={0}
              onClick={() => toggle(ev.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') toggle(ev.id);
              }}
              data-testid={`evidence-card-${ev.id}`}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {pick(ev.title)}
                  </span>
                  {ev.isKeyEvidence && (
                    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      {pick(ui.keyEvidence)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">
                  {ev.type}
                </span>
              </div>

              {isExpanded && (
                <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {pick(ev.content)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
