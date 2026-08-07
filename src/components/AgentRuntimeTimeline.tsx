import { useState } from 'react';
import { useExperimentStore } from '../stores/experimentStore';
import type { AgentEvent, AgentEventType } from '../types/events';
import EventDetailPanel from './EventDetailPanel';

// ── Event type display config ─────────────────────────────────────────────────

type EventDisplayConfig = {
  icon: string;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
};

const EVENT_CONFIG: Record<AgentEventType, EventDisplayConfig> = {
  MODEL_CALL: {
    icon: '\u{1F9E0}',
    label: 'MODEL_CALL',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
  },
  CONTEXT_BUILD: {
    icon: '\u{1F4CB}',
    label: 'CONTEXT_BUILD',
    bgClass: 'bg-gray-500/10',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/30',
  },
  PLAN_GENERATE: {
    icon: '\u{1F4DD}',
    label: 'PLAN_GENERATE',
    bgClass: 'bg-indigo-500/10',
    textClass: 'text-indigo-400',
    borderClass: 'border-indigo-500/30',
  },
  TOOL_SELECT: {
    icon: '\u{1F50D}',
    label: 'TOOL_SELECT',
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/30',
  },
  TOOL_EXECUTE: {
    icon: '\u{1F527}',
    label: 'TOOL_EXECUTE',
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/30',
  },
  OBSERVATION_RECEIVE: {
    icon: '\u{1F441}',
    label: 'OBSERVATION_RECEIVE',
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/30',
  },
  STATE_UPDATE: {
    icon: '\u{1F4CA}',
    label: 'STATE_UPDATE',
    bgClass: 'bg-slate-500/10',
    textClass: 'text-slate-400',
    borderClass: 'border-slate-500/30',
  },
  VERIFY: {
    icon: '✅',
    label: 'VERIFY',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
  },
  LOOP_STOP: {
    icon: '⏹',
    label: 'LOOP_STOP',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/30',
  },
};

// Override config for dynamic states (VERIFY failed, LOOP_STOP success)
function getEffectiveConfig(event: AgentEvent): EventDisplayConfig & { icon: string } {
  const base = EVENT_CONFIG[event.type];

  if (event.type === 'VERIFY' && event.payload.passed === false) {
    return {
      ...base,
      icon: '❌',
      bgClass: 'bg-red-500/10',
      textClass: 'text-red-400',
      borderClass: 'border-red-500/30',
    };
  }

  if (event.type === 'LOOP_STOP' && event.payload.reason === 'success') {
    return {
      ...base,
      icon: '\u{1F7E2}',
      bgClass: 'bg-green-500/10',
      textClass: 'text-green-400',
      borderClass: 'border-green-500/30',
    };
  }

  return base;
}

// ── Payload preview (one-line summary per event type) ─────────────────────────

function formatPayloadPreview(event: AgentEvent): string {
  const p = event.payload;

  switch (event.type) {
    case 'MODEL_CALL': {
      const prompt = typeof p.prompt === 'string' ? p.prompt : '';
      const truncated = prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt;
      return truncated || '(empty prompt)';
    }
    case 'CONTEXT_BUILD': {
      const tokens = p.tokenCount ?? '?';
      const limit = p.tokenLimit ?? '?';
      return `tokens ${tokens}/${limit}`;
    }
    case 'PLAN_GENERATE': {
      const count = p.stepCount ?? '?';
      return `${count} step${count === 1 ? '' : 's'}`;
    }
    case 'TOOL_SELECT': {
      return String(p.toolName ?? 'unknown');
    }
    case 'TOOL_EXECUTE': {
      const name = p.toolName ?? 'unknown';
      const ok = p.success === true ? '✓' : p.success === false ? '✗' : '';
      return `${name} ${ok}`;
    }
    case 'OBSERVATION_RECEIVE': {
      const source = p.source ?? 'unknown';
      const stale = p.isStale === true ? ' [STALE]' : '';
      return `${source}${stale}`;
    }
    case 'STATE_UPDATE': {
      const key = p.key ?? '?';
      return `${key} updated`;
    }
    case 'VERIFY': {
      const check = p.check ?? 'unknown';
      const passed = p.passed === true ? 'passed' : 'failed';
      return `${check}: ${passed}`;
    }
    case 'LOOP_STOP': {
      const reason = p.reason ?? 'unknown';
      const iters = p.iterations ?? '?';
      return `${reason} after ${iters} iteration${iters === 1 ? '' : 's'}`;
    }
    default:
      return '';
  }
}

// ── Timestamp formatter ───────────────────────────────────────────────────────

function formatTimestamp(ms: number): string {
  return (ms / 1000).toFixed(1) + 's';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgentRuntimeTimeline() {
  const currentTrace = useExperimentStore((s) => s.currentTrace);
  const isRunning = useExperimentStore((s) => s.isRunning);
  const [selectedEvent, setSelectedEvent] = useState<AgentEvent | null>(null);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!currentTrace || currentTrace.events.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-3xl mb-3 opacity-30">⏱</div>
          <p className="text-gray-400 dark:text-gray-600 font-mono text-sm">
            Run an experiment to see the agent's decision chain
          </p>
          {isRunning && (
            <p className="text-gray-500 dark:text-gray-500 font-mono text-xs mt-2 animate-pulse">
              Simulation in progress...
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Timeline ───────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Agent Runtime Timeline
          </h2>
          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            {currentTrace.events.length} event{currentTrace.events.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
          <span className={currentTrace.status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'}>
            {currentTrace.status}
          </span>
          <span>{currentTrace.totalTokens.toLocaleString()} tokens</span>
        </div>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-2">
          {currentTrace.events.map((event, idx) => {
            const config = getEffectiveConfig(event);
            const isSelected = selectedEvent?.id === event.id;

            return (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(isSelected ? null : event)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors border-l-2 ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-500'
                    : `${config.bgClass} border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50`
                }`}
              >
                {/* Step number */}
                <span className="text-[10px] font-mono text-gray-500 dark:text-gray-500 w-12 shrink-0 text-right tabular-nums">
                  Step {idx + 1}
                </span>

                {/* Icon */}
                <span className="text-sm shrink-0 w-5 text-center" role="img" aria-label={config.label}>
                  {config.icon}
                </span>

                {/* Type label */}
                <span className={`text-[11px] font-mono font-semibold shrink-0 w-36 ${config.textClass}`}>
                  {config.label}
                </span>

                {/* Timestamp */}
                <span className="text-[10px] font-mono text-gray-500 dark:text-gray-500 w-14 shrink-0 tabular-nums">
                  {formatTimestamp(event.timestamp)}
                </span>

                {/* Payload preview */}
                <span className="text-xs text-gray-300 dark:text-gray-500 font-mono truncate flex-1 min-w-0">
                  {formatPayloadPreview(event)}
                </span>

                {/* Selection indicator */}
                {isSelected && (
                  <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 shrink-0">
                    {/* details */}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selectedEvent && (
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-800">
          <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </div>
      )}
    </div>
  );
}
