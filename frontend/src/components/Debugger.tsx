import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import { simulate, connectSimulationWebSocket } from '../api';
import type { RunTrace, TraceStep } from '../types';
import Timeline from './Timeline';
import MemoryMonitor from './MemoryMonitor';
import EventBus from './EventBus';
import MonteCarloSummary from './MonteCarloSummary';
import { Play, Wifi, WifiOff, Loader2 } from 'lucide-react';

export default function Debugger() {
  const { t } = useTranslation();
  const {
    blueprint,
    latestTrace,
    setLatestTrace,
    monteCarloResult,
    isLive,
    setIsLive,
  } = useGame();

  const [selectedStep, setSelectedStep] = useState<TraceStep | null>(null);
  const [liveSteps, setLiveSteps] = useState<TraceStep[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsRef, setWsRef] = useState<WebSocket | null>(null);

  const hasData = latestTrace !== null || liveSteps.length > 0;
  const trace = latestTrace;
  const steps = isLive ? liveSteps : (trace?.steps ?? []);
  const memoryCapacity = blueprint.harness.memory_capacity;

  const handleSimulate = async () => {
    setRunning(true);
    setError(null);
    setSelectedStep(null);
    try {
      const result = await simulate(blueprint);
      setLatestTrace(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('factory.simulationFailed'));
    } finally {
      setRunning(false);
    }
  };

  const handleLiveSimulate = async () => {
    // First, POST to get a run_id
    setRunning(true);
    setError(null);
    setSelectedStep(null);
    setLiveSteps([]);
    setIsLive(true);

    try {
      const result = await simulate(blueprint);
      const runId = result.run_id;

      // Clean up existing WS
      if (wsRef) wsRef.close();

      const ws = connectSimulationWebSocket(
        runId,
        (step: TraceStep) => {
          setLiveSteps((prev) => [...prev, step]);
        },
        (trace: RunTrace) => {
          setLatestTrace(trace);
          setLiveSteps([]);
          setIsLive(false);
          setRunning(false);
        },
      );
      setWsRef(ws);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('debugger.liveSimulationFailed'));
      setIsLive(false);
      setRunning(false);
    }
  };

  // Sample trace selection from Monte Carlo
  const handleViewSampleTrace = (trace: RunTrace) => {
    setLatestTrace(trace);
    setSelectedStep(null);
  };

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 p-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
            <Play size={28} className="text-gray-400 dark:text-gray-600 ml-1" />
          </div>
          <p className="font-mono text-sm mb-2 text-gray-600 dark:text-gray-400">
            {t('debugger.noTrace')}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mb-6">
            {t('debugger.noTraceHint')}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleSimulate}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 text-sm font-medium transition-colors border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
            >
              {running ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              {t('debugger.singleRun')}
            </button>
            <button
              onClick={handleLiveSimulate}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 text-sm font-medium transition-colors border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
            >
              {running && isLive ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Wifi size={16} />
              )}
              {t('debugger.liveStream')}
            </button>
          </div>
          {error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400 font-mono">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
        <div className="flex items-center gap-3">
          {trace && (
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded ${
                trace.status === 'SUCCESS'
                  ? 'bg-green-400/10 text-green-600 dark:text-green-400 border border-green-400/20'
                  : 'bg-red-400/10 text-red-600 dark:text-red-400 border border-red-400/20'
              }`}
            >
              {trace.status === 'SUCCESS' ? t('monteCarlo.success') : t('monteCarlo.failed')}
              {trace.failure_reason !== 'NONE' &&
                ` — ${t(`monteCarlo.${trace.failure_reason.toLowerCase().replace(/_/g, '')}`, trace.failure_reason)}`}
            </span>
          )}
          {trace && (
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {trace.cost_tokens.toLocaleString()} {t('debugger.tokens')}
            </span>
          )}
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 animate-live-dot" />
              {t('debugger.live')}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSimulate}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
          >
            {running && !isLive ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Play size={12} />
            )}
            {t('debugger.reRun')}
          </button>
          <button
            onClick={handleLiveSimulate}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
          >
            {isLive ? <Wifi size={12} className="text-green-600 dark:text-green-400" /> : <WifiOff size={12} />}
            {t('debugger.live')}
          </button>
        </div>
      </div>

      {/* Main debugger content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Monte Carlo Summary (when available and not in live mode) */}
        {monteCarloResult && !isLive && (
          <div className="shrink-0 border-b border-gray-200 dark:border-gray-800">
            <MonteCarloSummary
              result={monteCarloResult}
              onViewTrace={handleViewSampleTrace}
            />
          </div>
        )}

        {/* Timeline */}
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-800">
          <Timeline
            steps={steps}
            selectedStep={selectedStep}
            onSelectStep={setSelectedStep}
            isLive={isLive}
            status={trace?.status}
          />
        </div>

        {/* Bottom panels: Memory Monitor + Event Bus */}
        <div className="flex-1 flex min-h-0">
          <div className="w-1/2 border-r border-gray-200 dark:border-gray-800 p-4 overflow-auto">
            <MemoryMonitor
              steps={steps}
              memoryCapacity={memoryCapacity}
            />
          </div>
          <div className="w-1/2 p-4 overflow-auto">
            <EventBus
              steps={steps}
              selectedStep={selectedStep}
              onSelectStep={setSelectedStep}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="absolute bottom-4 right-4 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2 text-sm text-red-600 dark:text-red-400 font-mono">
          {error}
        </div>
      )}
    </div>
  );
}
