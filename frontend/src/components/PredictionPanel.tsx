import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';

export default function PredictionPanel() {
  const { t } = useTranslation();
  const { prediction, setPrediction, selectedLevel } = useGame();
  const [draft, setDraft] = useState(prediction ?? 50);
  const confirmed = prediction !== null;

  const target = selectedLevel
    ? selectedLevel.target_success_rate <= 1
      ? Math.round(selectedLevel.target_success_rate * 100)
      : selectedLevel.target_success_rate
    : 70;

  return (
    <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('prediction.title')}
        </h3>
        {confirmed && (
          <button
            onClick={() => setPrediction(null)}
            className="text-[10px] font-mono text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {t('prediction.revise')}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        {t('prediction.hint', { target })}
      </p>

      <div className="flex items-center justify-between">
        <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">
          {t('prediction.label')}
        </label>
        <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
          {confirmed ? prediction : draft}%
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={confirmed ? prediction! : draft}
        disabled={confirmed}
        onChange={(e) => setDraft(parseInt(e.target.value, 10))}
        className="w-full h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-400 disabled:opacity-50"
      />

      {!confirmed && (
        <button
          onClick={() => setPrediction(draft)}
          className="w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          {t('prediction.confirm')}
        </button>
      )}

      {confirmed && (
        <p className="text-xs text-green-600 dark:text-green-400 font-mono">
          {t('prediction.locked', { value: prediction })}
        </p>
      )}
    </div>
  );
}
