import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { GraphNode } from '../types';
import { useGame } from '../context/GameContext';

export default function RuntimeGraph() {
  const { t } = useTranslation();
  const { latestTrace } = useGame();

  const activeNode = useMemo(() => {
    if (!latestTrace || latestTrace.steps.length === 0) return null;
    const last = latestTrace.steps[latestTrace.steps.length - 1];
    return last.node;
  }, [latestTrace]);

  const nodes: GraphNode[] = useMemo(() => {
    if (!latestTrace) return [];
    const ids = Array.from(new Set(latestTrace.steps.map((s) => s.node)));
    return ids.map((id) => ({ id, role: 'coder', state_writes: [] } as GraphNode));
  }, [latestTrace]);

  if (!latestTrace || nodes.length === 0) {
    return <div className="text-xs text-gray-400">{t('runtimeGraph.empty')}</div>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 p-3">
      <span className="font-mono text-xs text-gray-500 uppercase tracking-wider mr-1">
        {t('runtimeGraph.title')}
      </span>
      {nodes.map((n) => {
        const active = n.id === activeNode;
        return (
          <span
            key={n.id}
            className={`px-3 py-1 rounded-full text-xs font-mono border transition-all ${
              active
                ? 'bg-green-500/15 border-green-500 text-green-600 dark:text-green-300 ring-2 ring-green-500/30'
                : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {n.id}
          </span>
        );
      })}
    </div>
  );
}
