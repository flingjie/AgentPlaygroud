import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { successRatePct } from '../context/GameContext';

export default function ArchitectureDelta() {
  const { t } = useTranslation();
  const { levels, selectedLevelId } = useGame();
  return (
    <div className="space-y-3">
      <h3 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('architectureDelta.title')}
      </h3>
      {levels.map((lvl) => {
        const pct = successRatePct(lvl.target_success_rate);
        const active = lvl.id === selectedLevelId;
        return (
          <div key={lvl.id} className={`${active ? 'opacity-100' : 'opacity-60'}`}>
            <div className="flex justify-between text-xs font-mono">
              <span>{active ? lvl.learning_label : lvl.learning_label}</span>
              <span>{Math.round(pct)}%</span>
            </div>
            <div className="relative h-3 bg-gray-200 dark:bg-gray-800 rounded-full">
              <div
                className="h-3 rounded-full bg-green-500/70"
                style={{ width: `${pct}%` }}
              />
              <div
                className="absolute top-0 h-3 w-0.5 bg-amber-500"
                style={{ left: `calc(${pct}% - 1px)` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
