import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, X } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface BestiaryToastProps {
  onNavigateFactory?: () => void;
}

export default function BestiaryToast({ onNavigateFactory }: BestiaryToastProps) {
  const { t } = useTranslation();
  const { newUnlock, clearNewUnlock } = useGame();

  useEffect(() => {
    if (!newUnlock) return;
    const timer = setTimeout(() => clearNewUnlock(), 6000);
    return () => clearTimeout(timer);
  }, [newUnlock, clearNewUnlock]);

  if (!newUnlock) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-step-appear">
      <button
        onClick={() => {
          onNavigateFactory?.();
          clearNewUnlock();
        }}
        className="w-full text-left bg-gray-50 dark:bg-gray-900 border border-amber-400/30 rounded-xl p-4 shadow-lg hover:border-amber-400/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center shrink-0">
            <BookOpen size={16} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
              {t('bestiary.toastTitle')}
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
              {t(`bestiary.${newUnlock}.name`)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              {t(`bestiary.${newUnlock}.mechanism`)}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearNewUnlock();
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      </button>
    </div>
  );
}
