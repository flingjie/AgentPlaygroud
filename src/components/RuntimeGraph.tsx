import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TraceStep } from '../types';

export default function RuntimeGraph({ steps }: { steps: TraceStep[] }) {
  const { t } = useTranslation();

  const activeNode = useMemo(() => {
    if (steps.length === 0) return null;
    const last = steps[steps.length - 1];
    return last.node;
  }, [steps]);

  const nodes: { id: string | undefined }[] = useMemo(() => {
    const ids = Array.from(new Set(steps.map((s) => s.node)));
    return ids.map((id) => ({ id }));
  }, [steps]);

  if (steps.length === 0) {
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
