import { useRef, useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { TraceStep } from '../types';

interface EventBusProps {
  steps: TraceStep[];
  selectedStep: TraceStep | null;
  onSelectStep: (step: TraceStep) => void;
}

export default function EventBus({
  steps,
  selectedStep,
  onSelectStep,
}: EventBusProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [steps.length]);

  if (steps.length === 0) {
    return (
      <div>
        <h3 className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-3">
          Event Bus
        </h3>
        <div className="flex items-center justify-center h-40 text-gray-600 text-sm font-mono">
          Waiting for events...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs text-gray-400 uppercase tracking-wider">
          Event Bus
        </h3>
        <span className="text-xs text-gray-600 font-mono">
          {steps.filter((s) => s.status === 'FAIL').length} errors
        </span>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-1 pr-1"
      >
        {steps.map((step) => {
          const isSelected = selectedStep?.step === step.step;
          const isFailed = step.status === 'FAIL';

          return (
            <button
              key={step.step}
              onClick={() => onSelectStep(step)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors font-mono text-xs ${
                isSelected
                  ? 'bg-gray-800 ring-1 ring-white/10'
                  : isFailed
                    ? 'bg-red-400/5 hover:bg-red-400/10'
                    : 'hover:bg-gray-800/50'
              }`}
            >
              {/* Status icon */}
              {step.status === 'SUCCESS' ? (
                <CheckCircle2
                  size={12}
                  className="text-green-400 shrink-0 mt-px"
                />
              ) : (
                <XCircle
                  size={12}
                  className="text-red-400 shrink-0 mt-px"
                />
              )}

              {/* Timestamp / step number */}
              <span className="text-gray-600 shrink-0 w-10">
                [{step.step}]
              </span>

              {/* Node */}
              <span
                className={`shrink-0 w-16 font-medium ${
                  isFailed ? 'text-red-300' : 'text-gray-300'
                }`}
              >
                {step.node}
              </span>

              {/* Action */}
              <span className="text-gray-600 shrink-0 w-24 truncate">
                {step.action}
              </span>

              {/* Arrow */}
              <span className="text-gray-700 shrink-0">→</span>

              {/* Status */}
              <span
                className={`shrink-0 ${
                  isFailed ? 'text-red-400' : 'text-green-400'
                }`}
              >
                {step.status}
              </span>

              {/* Warning (truncated) */}
              {step.warning && (
                <span className="text-yellow-400 truncate ml-1 text-[10px]">
                  ({step.warning})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
