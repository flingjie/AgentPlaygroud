import { useTranslation } from 'react-i18next';
import { useExperimentStore } from '../stores/experimentStore';
import { experimentsByStage } from '../experiments/registry';

export default function ExperimentList() {
  const { t } = useTranslation();
  const { activeStage, activeExperimentId, setActiveExperimentId } =
    useExperimentStore();
  const exps = experimentsByStage(activeStage);

  return (
    <div className="space-y-1">
      <h3 className="px-2 mb-2 font-mono text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
        {t('sidebar.experiments')}
      </h3>
      {exps.map((exp) => (
        <button
          key={exp.id}
          onClick={() => setActiveExperimentId(exp.id)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
            activeExperimentId === exp.id
              ? 'bg-green-500/10 text-green-600 dark:text-green-300 border border-green-500/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <div className="font-medium text-xs">{exp.id}</div>
          <div className="text-[11px] text-gray-400 mt-0.5 truncate">
            {t(exp.titleKey)}
          </div>
        </button>
      ))}
    </div>
  );
}
