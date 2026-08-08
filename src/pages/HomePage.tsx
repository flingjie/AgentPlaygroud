import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import StageMap from '../components/StageMap';
import { SCENARIOS } from '../content/scenarios';
import { getIncident } from '../content/incidents';
import type { StageId, Scenario } from '../content/schema';
import type { StageGroup } from '../components/StageMap';
import { usePick } from '../i18n/I18nProvider';
import { ui } from '../i18n/uiStrings';

export default function HomePage() {
  const pick = usePick();
  const inc010 = getIncident('inc-010');

  const stages = useMemo<StageGroup[]>(() => {
    const groups: Record<StageId, Scenario[]> = {
      llm: [],
      harness: [],
      loop: [],
      graph: [],
      reliability: [],
    };
    for (const s of SCENARIOS) {
      groups[s.def.stage].push(s);
    }
    return [
      { id: 'harness', scenarios: groups.harness },
      { id: 'loop', scenarios: groups.loop },
      { id: 'graph', scenarios: groups.graph },
    ];
  }, []);

  return (
    <div className="space-y-6">
      {inc010 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-4">
          <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
            {pick(inc010.content.title)}
          </h2>
          <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
            {pick(inc010.content.patternSummary)}
          </p>
          <Link
            to="/incident/inc-010"
            className="inline-block rounded-lg px-4 py-2 bg-amber-600 text-white font-medium hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 transition"
          >
            {pick(ui.startDiagnosis)} →
          </Link>
        </div>
      )}
      <StageMap stages={stages} />
    </div>
  );
}
