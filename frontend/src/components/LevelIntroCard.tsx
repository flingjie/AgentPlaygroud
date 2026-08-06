import { useTranslation } from 'react-i18next';
import { Lightbulb, Eye } from 'lucide-react';
import { useGame } from '../context/GameContext';

export default function LevelIntroCard() {
  const { t } = useTranslation();
  const { selectedLevelId, selectedLevel, dismissedIntros, dismissIntro } =
    useGame();

  if (!selectedLevel) return null;
  if (dismissedIntros.includes(selectedLevelId)) return null;

  const analogy = t(`levels.${selectedLevelId}.intro.analogy`, '');
  const watchFor = t(`levels.${selectedLevelId}.intro.watchFor`, '');
  if (!analogy) return null;

  return (
    <div className="bg-blue-400/5 border border-blue-400/20 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Lightbulb size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {t('intro.title')}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {analogy}
          </p>
          {watchFor && (
            <div className="flex items-start gap-2 pt-1">
              <Eye size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {t('intro.watchFor')}{' '}
                </span>
                {watchFor}
              </p>
            </div>
          )}
        </div>
      </div>
      <button
        onClick={() => dismissIntro(selectedLevelId)}
        className="w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
      >
        {t('intro.start')}
      </button>
    </div>
  );
}
