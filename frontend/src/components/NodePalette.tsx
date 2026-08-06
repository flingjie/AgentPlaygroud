import { useTranslation } from 'react-i18next';
import type { GraphNode } from '../types';

const NODE_TYPES: { role: GraphNode['role']; i18nKey: string; bgColor: string }[] = [
  { role: 'planner', i18nKey: 'nodePalette.planner', bgColor: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' },
  { role: 'coder', i18nKey: 'nodePalette.coder', bgColor: 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' },
  { role: 'reviewer', i18nKey: 'nodePalette.reviewer', bgColor: 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400' },
  { role: 'tester', i18nKey: 'nodePalette.tester', bgColor: 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400' },
];

export default function NodePalette() {
  const { t } = useTranslation();

  const onDragStart = (event: React.DragEvent, role: GraphNode['role']) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ role }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-48 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-3 flex flex-col gap-2 shrink-0">
      <h3 className="font-mono text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
        {t('nodePalette.title')}
      </h3>
      <p className="text-xs text-gray-400 dark:text-gray-600 px-1 mb-1">
        {t('nodePalette.dragHint')}
      </p>
      {NODE_TYPES.map(({ role, i18nKey, bgColor }) => (
        <div
          key={role}
          draggable
          onDragStart={(e) => onDragStart(e, role)}
          className={`px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing font-mono text-sm font-medium transition-all hover:scale-105 hover:shadow-lg ${bgColor}`}
        >
          {t(i18nKey)}
        </div>
      ))}
    </aside>
  );
}
