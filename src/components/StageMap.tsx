import { Link } from 'react-router-dom';
import { usePick } from '../i18n/I18nProvider';
import { ui } from '../i18n/uiStrings';
import { useProgress } from '../state/progressStore';
import type { StageId, Scenario } from '../content/schema';

const STAGE_ORDER: StageId[] = ['harness', 'loop', 'graph'];

const STAGE_COLORS: Record<StageId, string> = {
  harness: 'border-l-sky-500',
  loop: 'border-l-amber-500',
  graph: 'border-l-violet-500',
};

export type StageGroup = { id: StageId; scenarios: Scenario[] };

export default function StageMap({ stages }: { stages: StageGroup[] }) {
  const pick = usePick();
  const byId = new Map(stages.map((s) => [s.id, s]));

  return (
    <div className="space-y-4">
      {STAGE_ORDER.map((id, index) => {
        const group = byId.get(id);
        if (!group) return null;
        return (
          <StageCard
            key={id}
            id={id}
            name={pick(ui.stages[id])}
            tagline={pick(ui.stageTaglines[id])}
            scenarios={group.scenarios}
            showConnector={index < STAGE_ORDER.length - 1}
          />
        );
      })}
    </div>
  );
}

function StageCard({
  id,
  name,
  tagline,
  scenarios,
  showConnector,
}: {
  id: StageId;
  name: string;
  tagline: string;
  scenarios: Scenario[];
  showConnector: boolean;
}) {
  return (
    <div className={`border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 border-l-4 ${STAGE_COLORS[id]} p-4`}>
      <h2 className="text-xl font-semibold mb-1">{name}</h2>
      <p className="text-zinc-600 dark:text-zinc-400 mb-4">{tagline}</p>
      <ul className="space-y-2">
        {scenarios.map((s) => (
          <ScenarioRow key={s.def.id} scenario={s} />
        ))}
      </ul>
      {showConnector && (
        <div className="flex justify-center mt-4 text-zinc-400 dark:text-zinc-600">
          ↓
        </div>
      )}
    </div>
  );
}

function ScenarioRow({ scenario }: { scenario: Scenario }) {
  const pick = usePick();
  const isCompleted = useProgress((s) => s.isCompleted);
  const isUnlocked = useProgress((s) => s.isUnlocked);

  const completed = isCompleted(scenario.def.id);
  const unlocked = isUnlocked(scenario.def);

  const baseClasses =
    'flex items-center justify-between p-3 rounded bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800';

  if (completed) {
    return (
      <li className={`${baseClasses} border-emerald-300 dark:border-emerald-900/50`}>
        <span className="text-zinc-800 dark:text-zinc-200">{pick(scenario.content.title)}</span>
        <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          ✓ {pick(ui.completed)}
        </span>
      </li>
    );
  }

  if (unlocked) {
    return (
      <li>
        <Link
          to={`/scenario/${scenario.def.id}`}
          className={`${baseClasses} hover:bg-zinc-100 dark:hover:bg-zinc-900 transition cursor-pointer border-l-2 ${STAGE_COLORS[scenario.def.stage]}`}
        >
          <span className="text-zinc-800 dark:text-zinc-200">{pick(scenario.content.title)}</span>
        </Link>
      </li>
    );
  }

  return (
    <li
      className={`${baseClasses} opacity-60 cursor-not-allowed`}
      aria-label={`${pick(scenario.content.title)} — ${pick(ui.locked)}. ${pick(ui.unlockHint)}`}
    >
      <span>
        <span className="text-zinc-500 dark:text-zinc-400">{pick(scenario.content.title)}</span>
        <span
          className="block text-xs text-zinc-400 dark:text-zinc-500"
          data-testid="unlock-hint"
        >
          {pick(ui.unlockHint)}
        </span>
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
        🔒 {pick(ui.locked)}
      </span>
    </li>
  );
}
