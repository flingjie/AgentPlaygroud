import { useMemo } from 'react';
import StageMap from '../components/StageMap';
import { SCENARIOS } from '../content/scenarios';
import type { StageId, Scenario } from '../content/schema';
import type { StageGroup } from '../components/StageMap';

export default function HomePage() {
  const stages = useMemo<StageGroup[]>(() => {
    const groups: Record<StageId, Scenario[]> = {
      harness: [],
      loop: [],
      graph: [],
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
  return <StageMap stages={stages} />;
}
