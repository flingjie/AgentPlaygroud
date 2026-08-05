import type { GraphNode } from '../types';

const NODE_TYPES: { role: GraphNode['role']; label: string; color: string; bgColor: string }[] = [
  { role: 'planner', label: 'Planner', color: '#3b82f6', bgColor: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
  { role: 'coder', label: 'Coder', color: '#22c55e', bgColor: 'bg-green-500/10 border-green-500/30 text-green-400' },
  { role: 'reviewer', label: 'Reviewer', color: '#a855f7', bgColor: 'bg-purple-500/10 border-purple-500/30 text-purple-400' },
  { role: 'tester', label: 'Tester', color: '#f97316', bgColor: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
];

export default function NodePalette() {
  const onDragStart = (event: React.DragEvent, role: GraphNode['role']) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ role }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-48 bg-gray-900 border-r border-gray-800 p-3 flex flex-col gap-2 shrink-0">
      <h3 className="font-mono text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">
        Node Palette
      </h3>
      <p className="text-xs text-gray-600 px-1 mb-1">
        Drag nodes onto the canvas
      </p>
      {NODE_TYPES.map(({ role, label, bgColor }) => (
        <div
          key={role}
          draggable
          onDragStart={(e) => onDragStart(e, role)}
          className={`px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing font-mono text-sm font-medium transition-all hover:scale-105 hover:shadow-lg ${bgColor}`}
        >
          {label}
        </div>
      ))}
    </aside>
  );
}
