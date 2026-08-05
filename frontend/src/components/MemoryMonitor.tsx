import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TraceStep } from '../types';
import { useMemo } from 'react';

interface MemoryMonitorProps {
  steps: TraceStep[];
  memoryCapacity: number;
}

export default function MemoryMonitor({ steps, memoryCapacity }: MemoryMonitorProps) {
  const chartData = useMemo(() => {
    // Add initial point at 0
    const points = [{ step: 0, memory: 0 }];
    steps.forEach((s) => {
      points.push({ step: s.step, memory: s.memory_used });
    });
    return points;
  }, [steps]);

  const currentMemory = steps.length > 0 ? steps[steps.length - 1].memory_used : 0;
  const pct = memoryCapacity > 0 ? (currentMemory / memoryCapacity) * 100 : 0;
  const isDanger = pct > 80;
  const isWarning = pct > 60 && pct <= 80;

  if (steps.length === 0) {
    return (
      <div>
        <h3 className="font-mono text-xs text-gray-400 uppercase tracking-wider mb-3">
          Memory Monitor
        </h3>
        <div className="flex items-center justify-center h-40 text-gray-600 text-sm font-mono">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs text-gray-400 uppercase tracking-wider">
          Memory Monitor
        </h3>
        <span
          className={`font-mono text-sm ${
            isDanger ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-green-400'
          }`}
        >
          {currentMemory} / {memoryCapacity}
        </span>
      </div>

      {/* Gauge bar */}
      <div className="mb-4">
        <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isDanger ? 'bg-red-400' : isWarning ? 'bg-yellow-400' : 'bg-green-400'
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-600 font-mono">
          <span>0</span>
          <span className={isDanger ? 'text-red-400' : ''}>
            {pct.toFixed(0)}%
          </span>
          <span>{memoryCapacity}</span>
        </div>
        {/* Danger zone marker */}
        <div className="relative h-1 mt-1">
          <div
            className="absolute top-0 h-full w-px bg-red-400/30"
            style={{ left: '80%' }}
          />
          <span
            className="absolute text-[9px] text-red-400/60 font-mono"
            style={{ left: '80%', top: '2px' }}
          >
            80%
          </span>
        </div>
      </div>

      {/* Chart: memory over time */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="step"
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              label={{
                value: 'Step',
                position: 'insideBottom',
                offset: -4,
                fill: '#64748b',
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
              }}
            />
            <YAxis
              stroke="#475569"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              domain={[0, memoryCapacity]}
              label={{
                value: 'Memory',
                angle: -90,
                position: 'insideLeft',
                offset: 8,
                fill: '#64748b',
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
              }}
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
              formatter={(_value: unknown) => [`${_value}`, 'Memory Used']}
              labelFormatter={(label: unknown) => `Step ${label}`}
            />
            <Bar
              dataKey="memory"
              fill={isDanger ? '#f87171' : isWarning ? '#facc15' : '#4ade80'}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Memory watermark */}
      {isDanger && (
        <div className="mt-3 flex items-start gap-2 p-2 rounded bg-red-400/5 border border-red-400/10 text-xs text-red-400">
          <span className="font-mono">⚠</span>
          <span>
            Memory usage at {pct.toFixed(0)}% — risk of context overflow. Consider
            reducing memory load or increasing capacity.
          </span>
        </div>
      )}
    </div>
  );
}
