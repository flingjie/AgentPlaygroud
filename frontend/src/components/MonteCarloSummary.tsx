import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useTheme } from '../context/ThemeContext';
import { successRatePct } from '../context/GameContext';
import type { MonteCarloResult, RunTrace, FailureReason } from '../types';
import { CheckCircle2, TrendingUp, Zap } from 'lucide-react';

interface MonteCarloSummaryProps {
  result: MonteCarloResult;
  onViewTrace: (trace: RunTrace) => void;
}

const FAILURE_COLORS: Record<string, string> = {
  HALLUCINATION: '#f97316',
  TOOL_FAILURE: '#f43f5e',
  FILE_CORROSION: '#ef4444',
  MEMORY_STACK_OVERFLOW: '#a855f7',
  CONTEXT_OVERFLOW: '#facc15',
  STALE_CONTEXT: '#14b8a6',
  FALSE_COMPLETION: '#84cc16',
  PERMISSION_ERROR: '#f59e0b',
  DEADLOCK: '#3b82f6',
  INFINITE_LOOP_TRAP: '#ec4899',
  BUDGET_EXHAUSTED: '#0ea5e9',
  TASK_ABANDONED: '#6b7280',
  UNSAFE_EXECUTION: '#dc2626',
};

const FAILURE_I18N_KEYS: Record<FailureReason | 'NONE', string> = {
  NONE: 'NONE',
  HALLUCINATION: 'monteCarlo.hallucination',
  TOOL_FAILURE: 'monteCarlo.toolFailure',
  FILE_CORROSION: 'monteCarlo.fileCorrosion',
  MEMORY_STACK_OVERFLOW: 'monteCarlo.memoryStackOverflow',
  CONTEXT_OVERFLOW: 'monteCarlo.contextOverflow',
  STALE_CONTEXT: 'monteCarlo.staleContext',
  FALSE_COMPLETION: 'monteCarlo.falseCompletion',
  PERMISSION_ERROR: 'monteCarlo.permissionError',
  DEADLOCK: 'monteCarlo.deadlock',
  INFINITE_LOOP_TRAP: 'monteCarlo.infiniteLoopTrap',
  TASK_ABANDONED: 'monteCarlo.taskAbandoned',
  BUDGET_EXHAUSTED: 'monteCarlo.budgetExhausted',
  UNSAFE_EXECUTION: 'monteCarlo.unsafeExecution',
};

export function getFailureLabel(reason: string, t: TFunction): string {
  const key = FAILURE_I18N_KEYS[reason as FailureReason];
  if (key && key !== 'NONE') return t(key, reason);
  return reason;
}

export default function MonteCarloSummary({
  result,
  onViewTrace,
}: MonteCarloSummaryProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const success_rate = Number.isFinite(result.success_rate)
    ? successRatePct(result.success_rate)
    : 0;
  const { avg_tokens, failure_distribution } = result;

  // Guard against malformed or empty failure_distribution
  const failureDistValid =
    failure_distribution != null &&
    typeof failure_distribution === 'object';

  const failTotal = failureDistValid
    ? Object.values(failure_distribution).reduce((a, b) => a + b, 0)
    : 0;
  const total = failTotal > 0
    ? (success_rate >= 100 ? failTotal : failTotal + Math.round(failTotal * success_rate / (100 - success_rate)))
    : 100;
  const actualSuccess = total - failTotal;
  const pieDataValid =
    Number.isFinite(actualSuccess) && Number.isFinite(failTotal) && (actualSuccess > 0 || failTotal > 0);
  const pieData = pieDataValid
    ? [
        { name: t('monteCarlo.success'), value: actualSuccess },
        { name: t('monteCarlo.failed'), value: failTotal },
      ]
    : [];
  const PIE_COLORS = ['#4ade80', '#ef4444'];

  const barData = failureDistValid
    ? Object.entries(failure_distribution)
        .filter(([, count]) => count > 0)
        .map(([reason, count]) => ({
          reason: getFailureLabel(reason, t),
          count,
          color: FAILURE_COLORS[reason] ?? '#6b7280',
        }))
    : [];

  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
  const tooltipText = isDark ? '#e2e8f0' : '#1e293b';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisStroke = isDark ? '#475569' : '#94a3b8';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const pieStroke = isDark ? '#0f172a' : '#f1f5f9';

  return (
    <div className="p-4 bg-gray-50/30 dark:bg-gray-900/30">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-blue-600 dark:text-blue-400" />
        <h3 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('monteCarlo.title')}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center">
          <span
            className={`text-4xl font-bold font-mono ${
              success_rate >= 80
                ? 'text-green-600 dark:text-green-400'
                : success_rate >= 50
                  ? 'text-yellow-500 dark:text-yellow-400'
                  : 'text-red-500 dark:text-red-400'
            }`}
          >
            {Math.round(success_rate)}%
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1">
            {t('monteCarlo.successRate')}
          </span>
          <div className="w-28 h-28 mt-2">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={24}
                    outerRadius={40}
                    dataKey="value"
                    strokeWidth={2}
                    stroke={pieStroke}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                      color: tooltipText,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 dark:text-gray-600 font-mono">
                {t('monteCarlo.noData')}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-yellow-600 dark:text-yellow-400" />
            <span className="text-2xl font-bold font-mono text-yellow-500 dark:text-yellow-400">
              {avg_tokens.toLocaleString()}
            </span>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            {t('monteCarlo.avgTokens')}
          </span>

          {barData.length > 0 && (
            <div className="w-full mt-3 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ left: 0, right: 10, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke={axisStroke}
                    tick={{ fill: tickColor, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="reason"
                    stroke={axisStroke}
                    tick={{ fill: tickColor, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      border: `1px solid ${tooltipBorder}`,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                      color: tooltipText,
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-2">
            {t('monteCarlo.sampleTraces')}
          </span>
          {result.sample_traces.map((trace) => (
            <button
              key={trace.run_id}
              onClick={() => onViewTrace(trace)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left mb-1 border border-transparent hover:border-gray-300 dark:hover:border-gray-700"
            >
              {trace.status === 'SUCCESS' ? (
                <CheckCircle2 size={14} className="text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-red-600 dark:bg-red-400 shrink-0" />
              )}
              <div className="min-w-0">
                <span className="text-xs font-mono text-gray-700 dark:text-gray-300 block truncate">
                  {trace.run_id}
                </span>
                <span
                  className={`text-[10px] font-mono ${
                    trace.status === 'SUCCESS'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}
                >
                  {trace.status === 'SUCCESS' ? t('monteCarlo.success') : t('monteCarlo.failed')}
                  {trace.failure_reason !== 'NONE' &&
                    ` — ${getFailureLabel(trace.failure_reason, t)}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
