import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { TraceStep } from '../types';

interface TimelineProps {
  steps: TraceStep[];
  selectedStep: TraceStep | null;
  onSelectStep: (step: TraceStep) => void;
  isLive: boolean;
  status?: string;
}

export default function Timeline({
  steps,
  selectedStep,
  onSelectStep,
  isLive,
}: TimelineProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to end when new steps arrive in live mode
  useEffect(() => {
    if (isLive && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [steps.length, isLive]);

  if (steps.length === 0) {
    return (
      <div className="px-4 py-6">
        <h3 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {t('timeline.title')}
        </h3>
        <div className="flex items-center justify-center h-20 text-gray-400 dark:text-gray-600 text-sm font-mono">
          {isLive ? t('timeline.waitingForSteps') : t('timeline.noSteps')}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('timeline.title')}
        </h3>
        <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">
          {t('timeline.stepCount', { count: steps.length })}
        </span>
      </div>

      {/* Horizontal scrollable timeline */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {steps.map((step, idx) => {
          const isSelected = selectedStep?.step === step.step;
          const isFailed = step.status === 'FAIL';
          const hasWarning = !!step.warning;
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.step} className="flex items-center gap-2 shrink-0">
              {/* Step card */}
              <button
                onClick={() => onSelectStep(step)}
                className={`flex flex-col items-start gap-1 px-3 py-2 rounded-lg border text-left transition-all min-w-[150px] ${
                  isSelected
                    ? 'border-gray-400/30 dark:border-white/30 bg-gray-200 dark:bg-gray-800 ring-1 ring-gray-400/10 dark:ring-white/10'
                    : isFailed
                      ? 'border-red-500/20 bg-red-400/5 hover:border-red-500/30'
                      : 'border-gray-300/50 dark:border-gray-700/50 bg-gray-100/30 dark:bg-gray-800/30 hover:border-gray-400 dark:hover:border-gray-600'
                } ${isLive && isLast ? 'animate-step-appear' : ''}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    [{step.step}]
                  </span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {step.node}
                  </span>
                  {step.status === 'SUCCESS' ? (
                    <CheckCircle2 size={14} className="text-green-500 dark:text-green-400 shrink-0 ml-auto" />
                  ) : (
                    <XCircle size={14} className="text-red-500 dark:text-red-400 shrink-0 ml-auto" />
                  )}
                </div>
                <span
                  className={`text-xs font-mono truncate max-w-[180px] ${
                    isFailed ? 'text-red-400 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.action}
                </span>
                {hasWarning && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <AlertTriangle size={10} className="text-yellow-500 dark:text-yellow-400 shrink-0" />
                    <span className="text-[10px] text-yellow-500 dark:text-yellow-400 truncate max-w-[140px]">
                      {step.warning}
                    </span>
                  </div>
                )}
              </button>

              {/* Arrow connector */}
              {!isLast && (
                <div className="w-6 h-px bg-gray-400 dark:bg-gray-700 shrink-0" />
              )}
            </div>
          );
        })}

        {/* Live indicator dot */}
        {isLive && (
          <div className="flex items-center shrink-0">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-live-dot" />
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Selected step detail */}
      {selectedStep && (
        <div className="mt-3 p-3 rounded-lg bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-400 dark:text-gray-500 font-mono block">{t('timeline.step')}</span>
              <span className="text-gray-800 dark:text-gray-200 font-mono">{selectedStep.step}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500 font-mono block">{t('timeline.node')}</span>
              <span className="text-gray-800 dark:text-gray-200 font-mono">{selectedStep.node}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500 font-mono block">{t('timeline.action')}</span>
              <span className="text-gray-800 dark:text-gray-200 font-mono">{selectedStep.action}</span>
            </div>
            <div>
              <span className="text-gray-400 dark:text-gray-500 font-mono block">{t('timeline.memory')}</span>
              <span
                className={`font-mono ${
                  selectedStep.memory_used > 8
                    ? 'text-red-600 dark:text-red-400'
                    : selectedStep.memory_used > 6
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-green-600 dark:text-green-400'
                }`}
              >
                {selectedStep.memory_used}
              </span>
            </div>
          </div>
          {selectedStep.warning && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              <span>{selectedStep.warning}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
