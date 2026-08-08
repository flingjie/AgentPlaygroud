import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePick } from '../i18n/I18nProvider';
import { ui } from '../i18n/uiStrings';
import { useProgress } from '../state/progressStore';
import type { StageId, Incident, IncidentDef } from '../content/schema';

const STAGE_ORDER: StageId[] = ['llm', 'harness', 'loop', 'graph', 'reliability'];

const STAGE_COLORS: Record<StageId, string> = {
  llm: 'border-l-rose-500',
  harness: 'border-l-sky-500',
  loop: 'border-l-amber-500',
  graph: 'border-l-violet-500',
  reliability: 'border-l-emerald-500',
};

const SEVERITY_COLORS: Record<string, string> = {
  P0: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  P1: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  P2: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

export type IncidentGroup = { id: StageId; incidents: Incident[] };

/**
 * Temporary bridge rule: until the full incident chain (orders 0–4) is
 * registered, the lowest-order incident in the registry is playable so the
 * app is not completely locked. Task 8+ will fill the chain so order 0
 * becomes the natural minimum and this rule becomes a no-op.
 */
export function isPlayable(
  def: IncidentDef,
  isUnlocked: (s: { id: string; order: number }) => boolean,
  list: Incident[],
): boolean {
  if (isUnlocked(def)) return true;
  const min = Math.min(...list.map((i) => i.def.order));
  return def.order === min;
}

export default function IncidentMap({ incidents }: { incidents: Incident[] }) {
  const pick = usePick();
  const groups = useMemo<IncidentGroup[]>(() => {
    const buckets: Record<StageId, Incident[]> = {
      llm: [],
      harness: [],
      loop: [],
      graph: [],
      reliability: [],
    };
    for (const inc of incidents) {
      buckets[inc.def.stage].push(inc);
    }
    return STAGE_ORDER.map((id) => ({ id, incidents: buckets[id] })).filter(
      (g) => g.incidents.length > 0,
    );
  }, [incidents]);

  return (
    <div className="space-y-4">
      {groups.map((group, index) => (
        <StageCard
          key={group.id}
          id={group.id}
          name={pick(ui.stages[group.id])}
          tagline={pick(ui.stageTaglines[group.id])}
          incidents={group.incidents}
          allIncidents={incidents}
          showConnector={index < groups.length - 1}
        />
      ))}
    </div>
  );
}

function StageCard({
  id,
  name,
  tagline,
  incidents,
  allIncidents,
  showConnector,
}: {
  id: StageId;
  name: string;
  tagline: string;
  incidents: Incident[];
  allIncidents: Incident[];
  showConnector: boolean;
}) {
  return (
    <div
      className={`border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 border-l-4 ${STAGE_COLORS[id]} p-4`}
    >
      <h2 className="text-xl font-semibold mb-1">{name}</h2>
      <p className="text-zinc-600 dark:text-zinc-400 mb-4">{tagline}</p>
      <ul className="space-y-2">
        {incidents.map((inc) => (
          <IncidentRow key={inc.def.id} incident={inc} allIncidents={allIncidents} />
        ))}
      </ul>
      {showConnector && (
        <div className="flex justify-center mt-4 text-zinc-400 dark:text-zinc-600">↓</div>
      )}
    </div>
  );
}

function IncidentRow({
  incident,
  allIncidents,
}: {
  incident: Incident;
  allIncidents: Incident[];
}) {
  const pick = usePick();
  const isCompleted = useProgress((s) => s.isCompleted);
  const isUnlocked = useProgress((s) => s.isUnlocked);

  const completed = isCompleted(incident.def.id);
  const playable = isPlayable(incident.def, isUnlocked, allIncidents);
  const title = pick(incident.content.title);

  const baseClasses =
    'flex items-center justify-between p-3 rounded bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800';

  if (completed) {
    return (
      <li className={`${baseClasses} border-emerald-300 dark:border-emerald-900/50`}>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={incident.def.incidentMeta.severity} />
          <span className="text-zinc-800 dark:text-zinc-200">{title}</span>
        </div>
        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          ✓ {pick(ui.completed)}
        </span>
      </li>
    );
  }

  if (playable) {
    return (
      <li>
        <Link
          to={`/incident/${incident.def.id}`}
          className={`${baseClasses} hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer border-l-2 ${STAGE_COLORS[incident.def.stage]}`}
        >
          <div className="flex items-center gap-2">
            <SeverityBadge severity={incident.def.incidentMeta.severity} />
            <span className="text-zinc-800 dark:text-zinc-200">{title}</span>
          </div>
        </Link>
      </li>
    );
  }

  return (
    <li
      className={`${baseClasses} opacity-60 cursor-not-allowed`}
      aria-label={`${title} — ${pick(ui.locked)}. ${pick(ui.unlockHint)}`}
    >
      <div className="flex items-center gap-2">
        <SeverityBadge severity={incident.def.incidentMeta.severity} />
        <span className="text-zinc-500 dark:text-zinc-400">{title}</span>
      </div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
        🔒 {pick(ui.locked)}
      </span>
    </li>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded ${
        SEVERITY_COLORS[severity] || 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
      }`}
    >
      {severity}
    </span>
  );
}
