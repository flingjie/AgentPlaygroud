import { useState } from 'react';
import type { Incident } from '../../content/schema';
import { usePick } from '../../i18n/I18nProvider';
import { ui } from '../../i18n/uiStrings';

export interface IncidentHeaderProps {
  incident: Incident;
}

export function IncidentHeader({ incident }: IncidentHeaderProps) {
  const pick = usePick();
  const [showClaim, setShowClaim] = useState(false);
  const meta = incident.def.incidentMeta;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {pick(incident.content.title)}
        </h2>
        <span
          className="inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          data-testid="incident-severity"
        >
          {pick(ui.severity)} {meta.severity}
        </span>
      </div>

      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <span className="font-medium">{pick(ui.reportedAt)}:</span> {meta.reportedAt}
      </div>

      <div className="text-sm text-zinc-700 dark:text-zinc-300">
        <span className="font-medium">{pick(ui.alertSummary)}:</span>{' '}
        {pick(meta.alertSummary)}
      </div>

      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        <span className="font-medium">{pick(ui.affectedSystems)}:</span>{' '}
        {meta.affectedSystems.map(pick).join(' · ')}
      </div>

      <button
        type="button"
        onClick={() => setShowClaim((s) => !s)}
        className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
      >
        {showClaim ? '−' : '+'} {pick(ui.agentClaim)}
      </button>

      {showClaim && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 text-sm text-zinc-700 dark:text-zinc-300">
          {pick(meta.agentClaim)}
        </div>
      )}
    </div>
  );
}
