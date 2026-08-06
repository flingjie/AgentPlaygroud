import { useTranslation } from 'react-i18next';
import { GraduationCap, X } from 'lucide-react';
import { useGame, successRatePct } from '../context/GameContext';

export default function DebriefModal() {
  const { t } = useTranslation();
  const {
    showDebrief,
    setShowDebrief,
    selectedLevelId,
    selectedLevel,
    levels,
    setSelectedLevelId,
    prediction,
    monteCarloResult,
  } = useGame();

  if (!showDebrief || !selectedLevel) return null;

  const concept = t(`levels.${selectedLevelId}.debrief.concept`, '');
  const conceptRef = t(`levels.${selectedLevelId}.debrief.conceptRef`, '');
  const summary = t(`levels.${selectedLevelId}.debrief.summary`, '');

  const actual = monteCarloResult
    ? successRatePct(monteCarloResult.success_rate)
    : null;
  const error =
    prediction != null && actual != null
      ? Math.round(actual - prediction)
      : null;

  const currentIdx = levels.findIndex((l) => l.id === selectedLevelId);
  const nextLevel =
    currentIdx >= 0 && currentIdx < levels.length - 1
      ? levels[currentIdx + 1]
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl relative">
        <button
          onClick={() => setShowDebrief(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-400/10 flex items-center justify-center">
            <GraduationCap size={20} className="text-green-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">
              {t('debrief.title')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t(`levels.${selectedLevelId}.name`, selectedLevel.name)}
            </p>
          </div>
        </div>

        {concept && (
          <div className="space-y-1">
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('debrief.conceptLabel')}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {concept}
            </p>
            {conceptRef && (
              <p className="text-sm text-blue-600 dark:text-blue-400 font-mono">
                {conceptRef}
              </p>
            )}
          </div>
        )}

        {summary && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {summary}
          </p>
        )}

        {prediction != null && actual != null && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 space-y-1">
            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {t('debrief.predictionReview')}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
              {t('debrief.predictionDetail', {
                predicted: prediction,
                actual: Math.round(actual),
                error:
                  error != null
                    ? error > 0
                      ? `+${error}`
                      : `${error}`
                    : '—',
              })}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setShowDebrief(false)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {t('debrief.continue')}
          </button>
          {nextLevel && (
            <button
              onClick={() => {
                setShowDebrief(false);
                setSelectedLevelId(nextLevel.id);
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors"
            >
              {t('debrief.nextLevel')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
