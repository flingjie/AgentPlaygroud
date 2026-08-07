import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, ArrowRight, CheckCircle, XCircle, Zap, CloudOff, BrainCircuit } from 'lucide-react';
import { useExperimentStore } from '../stores/experimentStore';
import { ALL_EXPERIMENTS } from '../experiments/registry';
import { getStage0Content } from '../content/stage0';
import { RAW_MODEL_BLUEPRINT, toSimConfig } from '../simulator/constants';
import { simulateRunV2 } from '../simulator/runtimeSimulator';

interface Stage0DashboardProps {
  onEnterFactory?: () => void;
}

const STAT_ICONS = {
  successRate: Zap,
  hallucinationRate: CloudOff,
  executionCapability: XCircle,
  statePersistence: BrainCircuit,
} as const;

const STAT_VALUES = {
  successRate: '8%',
  hallucinationRate: '65%',
  executionCapability: '0%',
  statePersistence: '0',
} as const;

const STAT_COLORS = {
  successRate: 'text-red-400',
  hallucinationRate: 'text-amber-400',
  executionCapability: 'text-gray-400',
  statePersistence: 'text-gray-400',
} as const;

const SCENARIO_EMOJIS: Record<string, string> = {
  '000-next-token': '🔤',
  '001-knowledge-boundary': '🌫️',
  '002-context-dependency': '🔗',
  '003-non-determinism': '🎲',
  '004-reasoning-vs-execution': '⚡',
};

export default function Stage0Dashboard({ onEnterFactory }: Stage0DashboardProps) {
  const { t } = useTranslation();
  const content = getStage0Content();
  const { setActiveExperimentId, setCurrentTrace } = useExperimentStore();
  const [verified, setVerified] = useState(false);
  const [verifyData, setVerifyData] = useState<{
    status: string;
    failureReason: string | null;
    totalTokens: number;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const stage0Exps = ALL_EXPERIMENTS.filter((e) => e.stage === 0);

  const handleVerify = useCallback(() => {
    setVerifying(true);
    // Run asynchronously so the UI doesn't freeze
    setTimeout(() => {
      const config = toSimConfig(RAW_MODEL_BLUEPRINT);
      const trace = simulateRunV2(config, 42, 'Answer the question');
      setCurrentTrace(trace);
      setVerifyData({
        status: trace.status,
        failureReason: trace.failureReason,
        totalTokens: trace.totalTokens,
      });
      setVerified(true);
      setVerifying(false);
    }, 100);
  }, [setCurrentTrace]);

  const dashboard = content.dashboard;

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* ── Header ─────────────────────────────────────────── */}
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {dashboard.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {dashboard.subtitle}
          </p>
        </header>

        {/* ── The Big Question ────────────────────────────────── */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-6 py-4 text-center">
          <p className="text-lg font-semibold text-amber-800 dark:text-amber-300">
            {dashboard.question}
          </p>
        </div>

        {/* ── Stat Cards (2×2) ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          {(
            Object.entries(dashboard.stats) as [
              keyof typeof dashboard.stats,
              (typeof dashboard.stats)[keyof typeof dashboard.stats],
            ][]
          ).map(([key, stat]) => {
            const Icon = STAT_ICONS[key];
            const value = STAT_VALUES[key];
            const colorClass = STAT_COLORS[key];
            const scenarioMap: Record<string, string> = {
              successRate: '000-next-token',
              hallucinationRate: '001-knowledge-boundary',
              executionCapability: '004-reasoning-vs-execution',
              statePersistence: '002-context-dependency',
            };

            return (
              <div
                key={key}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon size={24} className={colorClass} />
                  <span className={`text-3xl font-bold font-mono ${colorClass}`}>
                    {value}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {stat.label}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                  {stat.detail}
                </p>
                <button
                  onClick={() => setActiveExperimentId(scenarioMap[key])}
                  className="text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors"
                >
                  {stat.why}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Verify Button ───────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} />
            {verifying ? 'Running...' : dashboard.verifyButton}
          </button>

          {verified && verifyData && (
            <div className="flex items-center gap-2 text-sm">
              {verifyData.status === 'FAILED' ? (
                <XCircle size={16} className="text-red-400" />
              ) : (
                <CheckCircle size={16} className="text-green-400" />
              )}
              <span className="text-gray-600 dark:text-gray-300">
                Status: <strong>{verifyData.status}</strong>
                {verifyData.failureReason && (
                  <>
                    {' — '}
                    <span className="font-mono text-red-400">
                      {verifyData.failureReason}
                    </span>
                  </>
                )}
                {' · '}
                <span className="font-mono">
                  {verifyData.totalTokens.toLocaleString()} tokens
                </span>
              </span>
              <span className="text-xs text-gray-400">
                → Explore the Runtime tab
              </span>
            </div>
          )}
        </div>

        {/* ── Scenario Entry Cards ────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            5 Experiments
          </h2>
          {stage0Exps.map((exp, i) => {
            const emoji = SCENARIO_EMOJIS[exp.id] ?? '🔬';
            const scenarioId = String(i).padStart(3, '0');
            const scenarioContent = content.scenarios[scenarioId];

            return (
              <button
                key={exp.id}
                onClick={() => setActiveExperimentId(exp.id)}
                className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        {scenarioId}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {t(exp.titleKey)}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {scenarioContent?.subtitle ?? t(exp.descriptionKey)}
                    </p>
                  </div>
                  <ArrowRight
                    size={18}
                    className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors shrink-0"
                  />
                </div>
              </button>
            );
          })}
        </section>

        {/* ── CTA to Factory ──────────────────────────────────── */}
        {onEnterFactory && (
          <div className="text-center pt-4 pb-8">
            <button
              onClick={onEnterFactory}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              {dashboard.cta}
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
