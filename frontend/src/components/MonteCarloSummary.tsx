import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MonteCarloResult, RunTrace } from '../types';
import { CheckCircle2, TrendingUp, Zap } from 'lucide-react';

interface MonteCarloSummaryProps {
  result: MonteCarloResult;
  onViewTrace: (trace: RunTrace) => void;
}

const FAILURE_COLORS: Record<string, string> = {
  HALLUCINATED_TOOL: '#f97316',
  FILE_CORROSION: '#ef4444',
  MEMORY_STACK_OVERFLOW: '#a855f7',
  CONTEXT_FULL: '#facc15',
  INFINITE_LOOP_TRAP: '#ec4899',
  TASK_ABANDONED: '#6b7280',
};

const FAILURE_LABELS: Record<string, string> = {
  HALLUCINATED_TOOL: 'Hallucinated Tool',
  FILE_CORROSION: 'File Corrosion',
  MEMORY_STACK_OVERFLOW: 'Memory Stack Overflow',
  CONTEXT_FULL: 'Context Full',
  INFINITE_LOOP_TRAP: 'Infinite Loop Trap',
  TASK_ABANDONED: 'Task Abandoned',
};

export default function MonteCarloSummary({
  result,
  onViewTrace,
}: MonteCarloSummaryProps) {
  const { success_rate, avg_tokens, failure_distribution } = result;

  // Pie data: success vs failure
  const failTotal = Object.values(failure_distribution).reduce((a, b) => a + b, 0);
  const total = success_rate * (success_rate + failTotal) / 100 + failTotal;
  const actualSuccess = Math.round(success_rate / 100 * total);
  const pieData = [
    { name: 'Success', value: actualSuccess },
    { name: 'Failed', value: failTotal },
  ];
  const PIE_COLORS = ['#4ade80', '#ef4444'];

  // Failure distribution bar data
  const barData = Object.entries(failure_distribution)
    .filter(([, count]) => count > 0)
    .map(([reason, count]) => ({
      reason: FAILURE_LABELS[reason] ?? reason,
      count,
      color: FAILURE_COLORS[reason] ?? '#6b7280',
    }));

  return (
    <div className="p-4 bg-gray-900/30">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-blue-400" />
        <h3 className="font-mono text-xs text-gray-400 uppercase tracking-wider">
          Monte Carlo Results
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Success rate big number + pie */}
        <div className="flex flex-col items-center">
          <span
            className={`text-4xl font-bold font-mono ${
              success_rate >= 80
                ? 'text-green-400'
                : success_rate >= 50
                  ? 'text-yellow-400'
                  : 'text-red-400'
            }`}
          >
            {success_rate}%
          </span>
          <span className="text-xs text-gray-500 font-mono mt-1">
            Success Rate
          </span>
          <div className="w-28 h-28 mt-2">
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
                  stroke="#0f172a"
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono',
                    color: '#e2e8f0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Avg tokens */}
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-yellow-400" />
            <span className="text-2xl font-bold font-mono text-yellow-400">
              {avg_tokens.toLocaleString()}
            </span>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            Avg Tokens / Run
          </span>

          {/* Failure distribution chart */}
          {barData.length > 0 && (
            <div className="w-full mt-3 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ left: 0, right: 10, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="reason"
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                      color: '#e2e8f0',
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

        {/* Sample traces */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 font-mono mb-2">
            Sample Traces
          </span>
          {result.sample_traces.map((trace) => (
            <button
              key={trace.run_id}
              onClick={() => onViewTrace(trace)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left mb-1 border border-transparent hover:border-gray-700"
            >
              {trace.status === 'SUCCESS' ? (
                <CheckCircle2 size={14} className="text-green-400 shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-red-400 shrink-0" />
              )}
              <div className="min-w-0">
                <span className="text-xs font-mono text-gray-300 block truncate">
                  {trace.run_id}
                </span>
                <span
                  className={`text-[10px] font-mono ${
                    trace.status === 'SUCCESS'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {trace.status}
                  {trace.failure_reason !== 'NONE' &&
                    ` — ${trace.failure_reason}`}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
