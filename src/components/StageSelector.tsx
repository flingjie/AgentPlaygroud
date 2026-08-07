import { useExperimentStore } from '../stores/experimentStore';
import { STAGE_LABELS } from '../types/experiments';

export default function StageSelector() {
  const { activeStage, setActiveStage } = useExperimentStore();

  return (
    <div className="space-y-1">
      <h3 className="px-2 mb-2 font-mono text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        Stage
      </h3>
      {([0, 1, 2, 3] as const).map((stage) => (
        <button
          key={stage}
          onClick={() => setActiveStage(stage)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            activeStage === stage
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <span className="font-mono text-[10px] text-gray-400 mr-2">
            {stage}
          </span>
          {STAGE_LABELS[stage]}
        </button>
      ))}
    </div>
  );
}
