import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import mermaid from 'mermaid';
import { useGame } from '../context/GameContext';

// Static allowlist keyed by level_id. NEVER derive from user input, API
// responses, or blueprint fields: mermaid.render() output is assigned via
// innerHTML, so any dynamic source would be an XSS path. A missing level id
// short-circuits to null (render nothing).
const DIAGRAMS: Record<string, string> = {
  level_1_raw: `flowchart LR\n  A[Model] -->|no harness| B[Hallucinated tool]\n  A --> C[No stop condition]`,
  level_2_harness: `flowchart LR\n  H[Harness] --> T[Tool Registry]\n  H --> P[Persistence]\n  H --> S[Sandbox]\n  T --> X[Task fails once] -->|no loop| Y[Abandoned]`,
  level_3_loop: `flowchart LR\n  A[Observe] --> B[Act]\n  B --> C[Verify]\n  C -->|evidence pass| D[Stop]\n  C -->|fail| E[Feedback]\n  E --> B`,
  level_4_loop_stack: `flowchart LR\n  subgraph Outer[Improve Loop]\n    subgraph Inner[Verify Loop]\n      I1[Action] --> I2[Test]\n      I2 -->|fail| I1\n    end\n    I2 -->|green| O1[Review]\n    O1 -->|reject| Inner\n  end`,
  level_5_graph: `flowchart LR\n  P[Planner] --> C[Coder]\n  C -->|pass| R[Reviewer]\n  R -->|reject| C\n  R -->|approve| T[Tester]\n  T -->|fail| C`,
  level_6_agent_system: `flowchart LR\n  Plan --> Build --> Test --> Review --> Release\n  Review -->|reject| Build\n  Test -->|fail| Build`,
};

// Belt-and-suspenders for the innerHTML constraint: never auto-start, and
// strict securityLevel forbids HTML labels/URL schemes from rendering live.
mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });

export default function StaticFlowDiagram() {
  const { t } = useTranslation();
  const { selectedLevel } = useGame();
  const ref = useRef<HTMLDivElement>(null);
  const [id] = useState(() => `flow-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!selectedLevel) return;
    const src = DIAGRAMS[selectedLevel.id];
    const div = ref.current;
    if (!src || !div) return;
    let cancelled = false;
    mermaid
      .render(id, src)
      .then(({ svg }) => {
        if (!cancelled && div) div.innerHTML = svg;
      })
      .catch(() => {
        /* static sources are pre-validated; ignore transient render errors */
      });
    return () => {
      cancelled = true;
      if (div) div.innerHTML = '';
    };
  }, [selectedLevel, id]);

  if (!selectedLevel || !DIAGRAMS[selectedLevel.id]) return null;
  return (
    <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
      <h4 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        {t('staticFlow.title')}
      </h4>
      <div ref={ref} className="overflow-x-auto" />
    </div>
  );
}
