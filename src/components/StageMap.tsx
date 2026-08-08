import { useNavigate } from 'react-router-dom';
import { usePick } from '../i18n/I18nProvider';
import { ui } from '../i18n/uiStrings';
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
  const navigate = useNavigate();
  const byId = new Map(stages.map(s => [s.id, s]));

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
            onScenarioClick={(s) => navigate(`/scenario/${s.def.id}`)}
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
  onScenarioClick,
  showConnector,
}: {
  id: StageId;
  name: string;
  tagline: string;
  scenarios: Scenario[];
  onScenarioClick: (s: Scenario) => void;
  showConnector: boolean;
}) {
  const pick = usePick();
  return (
    <div className={`border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 border-l-4 ${STAGE_COLORS[id]} p-4`}>
      <h2 className="text-xl font-semibold mb-1">{name}</h2>
      <p className="text-zinc-600 dark:text-zinc-400 mb-4">{tagline}</p>
      <ul className="space-y-2">
        {scenarios.map(s => (
          <li
            key={s.def.id}
            onClick={() => onScenarioClick(s)}
            className="flex items-center justify-between p-3 rounded bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <span>{pick(s.content.title)}</span>
            {s.def.order !== 1 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                🔒 {pick(ui.locked)}
              </span>
            )}
          </li>
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
