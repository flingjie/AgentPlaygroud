import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';

export default function SuccessGauge() {
  const { t } = useTranslation();
  const { selectedLevel, monteCarloResult } = useGame();
  const target = selectedLevel?.target_success_rate ?? 70;
  const current = monteCarloResult?.success_rate ?? 0;
  const hasResult = monteCarloResult !== null;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - target / 100);
  const currentOffset = circumference * (1 - current / 100);

  return (
    <div className="space-y-3">
      <h3 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('successGauge.title')}
      </h3>

      <div className="flex items-center justify-center">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
            {/* Background circle */}
            <circle
              cx={64}
              cy={64}
              r={radius}
              fill="none"
              stroke="#e2e8f0"
              className="dark:stroke-[#1e293b]"
              strokeWidth={10}
            />
            {/* Target marker */}
            <circle
              cx={64}
              cy={64}
              r={radius}
              fill="none"
              stroke="#94a3b8"
              className="dark:stroke-[#475569]"
              strokeWidth={10}
              strokeDasharray={circumference}
              strokeDashoffset={targetOffset}
              strokeLinecap="round"
            />
            {/* Current value (only when we have a result) */}
            {hasResult && (
              <circle
                cx={64}
                cy={64}
                r={radius}
                fill="none"
                stroke={
                  current >= target ? '#4ade80' : '#f87171'
                }
                strokeWidth={10}
                strokeDasharray={circumference}
                strokeDashoffset={currentOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {hasResult ? (
              <>
                <span
                  className={`text-2xl font-bold font-mono ${
                    current >= target ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {current}%
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                  {t('successGauge.target', { value: target })}
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-400 dark:text-gray-600 font-mono">
                {t('successGauge.noData')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
