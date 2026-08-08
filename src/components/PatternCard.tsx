import { successRateOf } from '../engine/simulator';
import { usePick } from '../i18n/I18nProvider';
import { ui } from '../i18n/uiStrings';
import { stageAccent } from './stageAccent';
import type { CapabilityId, Incident } from '../content/schema';

export interface PatternCardProps {
  incident: Incident;
}

export function PatternCard({ incident }: PatternCardProps) {
  const pick = usePick();
  const before = incident.def.baseSuccess;
  const after = successRateOf(incident.def, new Set(Object.keys(incident.def.capabilityEffects) as CapabilityId[]));

  return (
    <div
      data-testid="pattern-card"
      className={`rounded-r-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 border-l-4 ${stageAccent[incident.def.stage]}`}
    >
      <h3 className="text-lg font-semibold mb-1">
        {pick(incident.content.patternName)}
      </h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
        {pick(incident.content.patternSummary)}
      </p>
      <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {pick(ui.successRate)}: {Math.round(before * 100)}% → {Math.round(after * 100)}%
      </div>
    </div>
  );
}
