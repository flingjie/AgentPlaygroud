import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { GraphNode } from '../types';

const ROLE_STYLES: Record<GraphNode['role'], { border: string; bg: string; text: string; glow: string }> = {
  planner: {
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    glow: 'hover:shadow-blue-500/20',
  },
  coder: {
    border: 'border-green-500',
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    glow: 'hover:shadow-green-500/20',
  },
  reviewer: {
    border: 'border-purple-500',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    glow: 'hover:shadow-purple-500/20',
  },
  tester: {
    border: 'border-orange-500',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    glow: 'hover:shadow-orange-500/20',
  },
};

const ROLE_ICONS: Record<GraphNode['role'], string> = {
  planner: 'P',
  coder: 'C',
  reviewer: 'R',
  tester: 'T',
};

function AgentNode({ data, selected }: NodeProps) {
  const role = (data.role as GraphNode['role']) || 'coder';
  const styles = ROLE_STYLES[role];
  const label = (data.label as string) || role;

  return (
    <div
      className={`px-4 py-3 rounded-xl border-2 min-w-[140px] transition-all ${styles.border} ${styles.bg} ${
        selected ? `ring-2 ring-white/30 ${styles.glow}` : styles.glow
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-500 !w-3 !h-3 !border-2 !border-gray-800"
      />
      <div className="flex items-center gap-2">
        <span
          className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold font-mono ${styles.bg} ${styles.text} border ${styles.border}`}
        >
          {ROLE_ICONS[role]}
        </span>
        <div>
          <p className="text-sm font-medium text-gray-200">{label}</p>
          <p className={`text-xs font-mono ${styles.text}`}>{role}</p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-gray-500 !w-3 !h-3 !border-2 !border-gray-800"
      />
    </div>
  );
}

export default memo(AgentNode);
