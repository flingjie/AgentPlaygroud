import { X } from 'lucide-react';
import type { AgentEvent } from '../types/events';

// ── Event type colours for the detail header ──────────────────────────────────

const EVENT_HEADER_COLORS: Record<string, string> = {
  MODEL_CALL: 'border-blue-500/30 bg-blue-500/5',
  CONTEXT_BUILD: 'border-gray-500/30 bg-gray-500/5',
  PLAN_GENERATE: 'border-indigo-500/30 bg-indigo-500/5',
  TOOL_SELECT: 'border-cyan-500/30 bg-cyan-500/5',
  TOOL_EXECUTE: 'border-green-500/30 bg-green-500/5',
  OBSERVATION_RECEIVE: 'border-purple-500/30 bg-purple-500/5',
  STATE_UPDATE: 'border-slate-500/30 bg-slate-500/5',
  VERIFY: 'border-amber-500/30 bg-amber-500/5',
  LOOP_STOP: 'border-red-500/30 bg-red-500/5',
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

// Sort payload keys so the most important fields come first
const KEY_ORDER: Record<string, number> = {
  // MODEL_CALL
  prompt: 0,
  modelId: 1,
  temperature: 2,
  tokensUsed: 3,
  // CONTEXT_BUILD
  systemPrompt: 0,
  tokenCount: 1,
  tokenLimit: 2,
  memoryCount: 3,
  toolCount: 4,
  // PLAN_GENERATE
  stepCount: 0,
  steps: 1,
  // TOOL_SELECT
  toolName: 0,
  args: 1,
  confidence: 2,
  // TOOL_EXECUTE
  input: 1,
  output: 2,
  success: 3,
  error: 4,
  // OBSERVATION_RECEIVE
  source: 0,
  data: 1,
  isStale: 2,
  // STATE_UPDATE
  key: 0,
  oldValue: 1,
  newValue: 2,
  // VERIFY
  check: 0,
  passed: 1,
  evidence: 2,
  // LOOP_STOP
  iterations: 0,
  reason: 1,
};

function sortPayloadKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const orderA = KEY_ORDER[a] ?? 99;
    const orderB = KEY_ORDER[b] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EventDetailPanelProps {
  event: AgentEvent;
  onClose: () => void;
}

export default function EventDetailPanel({ event, onClose }: EventDetailPanelProps) {
  const payloadKeys = Object.keys(event.payload);
  const borderColor = EVENT_HEADER_COLORS[event.type] ?? 'border-gray-500/30 bg-gray-500/5';

  return (
    <div className="px-4 py-3 max-h-64 overflow-y-auto">
      <div className={`rounded-lg border p-3 ${borderColor}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
              Event Detail
            </span>
            <span className="text-[10px] font-mono text-gray-500">
              {event.type}
            </span>
            <span className="text-[10px] font-mono text-gray-600">
              @ {formatTimestamp(event.timestamp)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close detail panel"
          >
            <X size={14} />
          </button>
        </div>

        {/* Node */}
        <div className="mb-2 text-[10px] font-mono text-gray-500">
          node: <span className="text-gray-300">{event.nodeId}</span>
        </div>

        {/* Payload table */}
        <div className="overflow-hidden rounded border border-gray-700/50">
          <table className="w-full text-[11px] font-mono">
            <tbody>
              {sortPayloadKeys(payloadKeys).map((key) => {
                const raw = event.payload[key];
                const display = formatValue(raw);
                const isLong = display.length > 80 || (typeof raw === 'object' && raw !== null);

                return (
                  <tr
                    key={key}
                    className="border-t border-gray-700/30 first:border-t-0"
                  >
                    <td className="px-2.5 py-1.5 text-gray-500 dark:text-gray-400 w-1/3 align-top whitespace-nowrap bg-gray-500/5">
                      {key}
                    </td>
                    <td className={`px-2.5 py-1.5 text-gray-200 dark:text-gray-200 align-top ${
                      isLong ? 'break-all' : ''
                    }`}>
                      {key === 'passed'
                        ? (raw === true
                          ? <span className="text-green-400">true</span>
                          : <span className="text-red-400">false</span>)
                        : key === 'success'
                          ? (raw === true
                            ? <span className="text-green-400">true</span>
                            : raw === false
                              ? <span className="text-red-400">false</span>
                              : display)
                        : key === 'isStale'
                          ? (raw === true
                            ? <span className="text-yellow-400">true</span>
                            : <span className="text-gray-400">false</span>)
                        : key === 'error' && raw
                          ? <span className="text-red-400">{display}</span>
                        : display
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatTimestamp(ms: number): string {
  return (ms / 1000).toFixed(1) + 's';
}
