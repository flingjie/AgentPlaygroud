import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import type { TraceStep } from '../types';
import { useMemo } from 'react';

interface MemoryMonitorProps {
  steps: TraceStep[];
  memoryCapacity: number;
}

export default function MemoryMonitor({ steps, memoryCapacity }: MemoryMonitorProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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

  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisStroke = isDark ? '#475569' : '#94a3b8';
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
  const tooltipText = isDark ? '#e2e8f0' : '#1e293b';

  if (steps.length === 0) {
    return (
      <div>
        <h3 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {t('memoryMonitor.title')}
        </h3>
        <div className="flex items-center justify-center h-40 text-gray-400 dark:text-gray-600 text-sm font-mono">
          {t('memoryMonitor.noData')}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {t('memoryMonitor.title')}
        </h3>
        <span
          className={`font-mono text-sm ${
            isDanger ? 'text-red-600 dark:text-red-400' : isWarning ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
          }`}
        >
          {currentMemory} / {memoryCapacity}
        </span>
      </div>

      {/* Gauge bar */}
      <div className="mb-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isDanger ? 'bg-red-500 dark:bg-red-400' : isWarning ? 'bg-yellow-500 dark:bg-yellow-400' : 'bg-green-500 dark:bg-green-400'
            }`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-400 dark:text-gray-600 font-mono">
          <span>0</span>
          <span className={isDanger ? 'text-red-600 dark:text-red-400' : ''}>
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
            className="absolute text-[9px] text-red-500/70 dark:text-red-400/60 font-mono"
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
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="step"
              stroke={axisStroke}
              tick={{ fill: tickColor, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              label={{
                value: t('memoryMonitor.step'),
                position: 'insideBottom',
                offset: -4,
                fill: tickColor,
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
              }}
            />
            <YAxis
              stroke={axisStroke}
              tick={{ fill: tickColor, fontSize: 10, fontFamily: 'JetBrains Mono' }}
              domain={[0, memoryCapacity]}
              label={{
                value: t('memoryMonitor.memory'),
                angle: -90,
                position: 'insideLeft',
                offset: 8,
                fill: tickColor,
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
              }}
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
              formatter={(_value: unknown) => [`${_value}`, t('memoryMonitor.memoryUsed')]}
              labelFormatter={(label: unknown) => `${t('memoryMonitor.step')} ${label}`}
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
        <div className="mt-3 flex items-start gap-2 p-2 rounded bg-red-400/5 border border-red-400/10 text-xs text-red-600 dark:text-red-400">
          <span className="font-mono">{'⚠'}</span>
          <span>
            {t('memoryMonitor.dangerWarning', { pct: pct.toFixed(0) })}
          </span>
        </div>
      )}
    </div>
  );
}
