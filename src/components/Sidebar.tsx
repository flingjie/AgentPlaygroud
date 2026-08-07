import { BrainCircuit } from 'lucide-react';
import ExperimentList from './ExperimentList';

export default function Sidebar() {
  return (
    <aside className="w-56 border-r border-gray-200 dark:border-gray-800 p-3 flex flex-col gap-6 overflow-y-auto bg-gray-50 dark:bg-gray-950">
      {/* Static Stage 0 label — replaces StageSelector for lab mode */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <BrainCircuit size={14} className="text-blue-400 shrink-0" />
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
            Stage 0 · Model Engineering
          </span>
        </div>
      </div>
      <ExperimentList />
    </aside>
  );
}
