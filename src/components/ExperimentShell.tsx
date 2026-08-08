import { useState } from 'react';
import { Link } from 'react-router-dom';
import { runMonteCarlo, type MonteCarloSummary } from '../engine/simulator';
import { pickShowcaseTrial } from '../engine/showcase';
import { buildTimeline, type RunEvent } from '../engine/events';
import { usePick } from '../i18n/I18nProvider';
import { ui } from '../i18n/uiStrings';
import { useProgress } from '../state/progressStore';
import { SCENARIOS } from '../content/scenarios';
import { CapabilityPanel } from './CapabilityPanel';
import { MetricsPanel } from './MetricsPanel';
import { EventTimeline } from './EventTimeline';
import { PatternCard } from './PatternCard';
import { stageAccent } from './stageAccent';
import type { CapabilityId, Scenario } from '../content/schema';

export interface ExperimentShellProps {
  scenario: Scenario;
}

export function ExperimentShell({ scenario }: ExperimentShellProps) {
  const pick = usePick();
  const completeScenario = useProgress((s) => s.completeScenario);
  const inventory = useProgress((s) => s.inventory);
  const isCompleted = useProgress((s) => s.isCompleted);

  const [enabled, setEnabled] = useState<Set<CapabilityId>>(new Set());
  const [phase, setPhase] = useState<'idle' | 'running' | 'failed' | 'reviewed' | 'completed'>('idle');
  const [summary, setSummary] = useState<MonteCarloSummary | null>(null);
  const [timeline, setTimeline] = useState<RunEvent[]>([]);
  const [baselineSummary, setBaselineSummary] = useState<MonteCarloSummary | null>(null);
  const [lastRunEnabled, setLastRunEnabled] = useState<Set<CapabilityId> | null>(null);

  const alreadyCompleted = isCompleted(scenario.def.id);
  const nextScenario = SCENARIOS.find((x) => x.def.order === scenario.def.order + 1);

  function run() {
    setPhase('running');
    const seed = Date.now() % 1_000_000;
    const mc = runMonteCarlo(scenario.def, enabled, seed);
    const trial = pickShowcaseTrial(scenario.def, enabled, seed);
    setSummary(mc);
    if (!baselineSummary && enabled.size === 0) setBaselineSummary(mc);
    setTimeline(buildTimeline(scenario.def, trial, enabled));
    setLastRunEnabled(new Set(enabled));
    setPhase(trial.success && enabled.size === 0 ? 'reviewed' : !trial.success && enabled.size === 0 ? 'failed' : 'reviewed');
  }

  const canComplete =
    lastRunEnabled !== null &&
    scenario.def.requiredCapabilities.every((c) => lastRunEnabled.has(c));

  function handleComplete() {
    if (phase === 'completed') return;
    if (!canComplete) return;
    completeScenario(scenario.def);
    setPhase('completed');
  }

  function toggleCapability(id: CapabilityId, checked: boolean) {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const runButtonText = phase === 'idle' || phase === 'running' ? ui.runBaseline : ui.runAgain;
  const isRunning = phase === 'running';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {pick(scenario.content.title)}
        </h1>
        {alreadyCompleted && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
            ✓ {pick(ui.completed)}
          </span>
        )}
      </div>

      <div
        className={`rounded-r-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 border-l-4 ${stageAccent[scenario.def.stage]}`}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-1">
          {pick(ui.mission)}
        </h2>
        <p data-testid="mission" className="text-zinc-800 dark:text-zinc-200">
          {pick(scenario.content.mission)}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{pick(ui.baselineConfig)}</p>
      </div>

      {phase === 'completed' ? (
        <div className="space-y-4">
          <PatternCard scenario={scenario} />
          {nextScenario ? (
            <Link
              to={`/scenario/${nextScenario.def.id}`}
              className="inline-block rounded-lg px-4 py-2 bg-sky-600 text-white font-medium hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 transition"
            >
              {pick(ui.nextScenario)} →
            </Link>
          ) : (
            <Link
              to="/patterns"
              className="inline-block rounded-lg px-4 py-2 bg-emerald-600 text-white font-medium hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 transition"
            >
              {pick(ui.allComplete)} →
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CapabilityPanel
              scenario={scenario}
              enabled={enabled}
              inventory={inventory}
              onChange={toggleCapability}
            />
            <div className="space-y-6">
              <MetricsPanel baseline={baselineSummary} current={summary} />
              <EventTimeline events={timeline} />
            </div>
          </div>

          {phase === 'failed' && (
            <div
              data-testid="failure-panel"
              className="rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-4"
            >
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                {pick(ui.failureRevealed)}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {pick(scenario.content.failureNarrative)}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              data-testid="run-button"
              onClick={run}
              disabled={isRunning}
              className={`rounded-lg px-4 py-2 font-medium transition ${
                isRunning
                  ? 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed'
                  : 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500'
              }`}
            >
              {pick(runButtonText)}
            </button>
            <button
              data-testid="complete-button"
              onClick={handleComplete}
              disabled={!canComplete}
              className={`rounded-lg px-4 py-2 font-medium transition ${
                canComplete
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500'
                  : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed'
              }`}
            >
              {pick(ui.complete)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
