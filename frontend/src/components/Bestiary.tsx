import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { ALL_FAILURE_REASONS, type FailureReason } from '../types';

export default function Bestiary() {
  const { t } = useTranslation();
  const { unlockedFailures } = useGame();
  const [open, setOpen] = useState(true);
  const unlocked = unlockedFailures.length;

  return (
    <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-amber-500" />
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t('bestiary.title')}
          </span>
          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
            {unlocked}/6
          </span>
        </div>
        {open ? (
          <ChevronUp size={14} className="text-gray-400" />
        ) : (
          <ChevronDown size={14} className="text-gray-400" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 grid grid-cols-1 gap-2">
          {ALL_FAILURE_REASONS.map((reason) => (
            <BestiaryCard
              key={reason}
              reason={reason}
              unlocked={unlockedFailures.includes(reason)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BestiaryCard({
  reason,
  unlocked,
}: {
  reason: FailureReason;
  unlocked: boolean;
}) {
  const { t } = useTranslation();

  if (!unlocked) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200/40 dark:bg-gray-800/40 border border-dashed border-gray-300 dark:border-gray-700 opacity-60">
        <Lock size={12} className="text-gray-400 dark:text-gray-600 shrink-0" />
        <span className="text-xs font-mono text-gray-400 dark:text-gray-600">
          ??? — {t('bestiary.locked')}
        </span>
      </div>
    );
  }

  return (
    <div className="px-3 py-2.5 rounded-lg bg-amber-400/5 border border-amber-400/20 space-y-1">
      <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
        {t(`bestiary.${reason}.name`)}
      </p>
      <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
        <span className="font-mono text-gray-400 dark:text-gray-500 uppercase text-[9px] tracking-wider mr-1">
          {t('bestiary.trigger')}
        </span>
        {t(`bestiary.${reason}.trigger`)}
      </p>
      <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
        <span className="font-mono text-gray-400 dark:text-gray-500 uppercase text-[9px] tracking-wider mr-1">
          {t('bestiary.counter')}
        </span>
        {t(`bestiary.${reason}.counter`)}
      </p>
      <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed italic">
        {t(`bestiary.${reason}.reality`)}
      </p>
    </div>
  );
}
