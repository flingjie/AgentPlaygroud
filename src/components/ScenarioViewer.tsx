import { ArrowRight, ArrowLeft, Brain, Eye, Lightbulb } from 'lucide-react';
import { useExperimentStore } from '../stores/experimentStore';
import { ALL_EXPERIMENTS, experimentById } from '../experiments/registry';
import { getStage0Content } from '../content/stage0';
import type { ContentStep } from '../content/stage0/types';

// ── Sub-component: renders a ContentStep in the appropriate visual mode ─────

function ContentStepBlock({ step }: { step: ContentStep }) {
  switch (step.mode) {
    case 'chat':
      return <ChatBlock step={step} />;
    case 'code':
      return <CodeBlock step={step} />;
    case 'terminal':
      return <TerminalBlock step={step} />;
    case 'text':
    default:
      return <TextBlock step={step} />;
  }
}

function ChatBlock({ step }: { step: ContentStep }) {
  const isUser = step.speaker === 'user';
  const isModel = step.speaker === 'model';
  const isSystem = step.speaker === 'system';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'order-1' : ''}`}>
        <div className="text-[10px] font-mono text-gray-400 mb-1 uppercase tracking-wider">
          {isUser ? 'You' : isModel ? 'Model' : isSystem ? 'System' : step.speaker}
        </div>
        <div
          className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-blue-500/10 text-blue-100 border border-blue-500/20'
              : isSystem
                ? 'bg-gray-500/10 text-gray-300 border border-gray-500/20 font-mono text-xs'
                : 'bg-green-500/10 text-green-100 border border-green-500/20'
          }`}
        >
          <div className="whitespace-pre-wrap">{step.content}</div>
        </div>
        {step.caption && (
          <p className="text-[11px] text-gray-500 mt-1 italic">{step.caption}</p>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ step }: { step: ContentStep }) {
  return (
    <div className="mb-4">
      {step.speaker && (
        <div className="text-[10px] font-mono text-gray-400 mb-1 uppercase tracking-wider">
          {step.speaker}
        </div>
      )}
      <div className="bg-gray-900 dark:bg-gray-950 border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-700">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
        </div>
        <pre className="px-4 py-3 text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
          {step.content}
        </pre>
      </div>
      {step.caption && (
        <p className="text-[11px] text-gray-500 mt-1 italic">{step.caption}</p>
      )}
    </div>
  );
}

function TerminalBlock({ step }: { step: ContentStep }) {
  return (
    <div className="mb-4">
      {step.speaker && (
        <div className="text-[10px] font-mono text-gray-400 mb-1 uppercase tracking-wider">
          {step.speaker}
        </div>
      )}
      <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-800">
          <span className="text-[10px] font-mono text-gray-500">terminal</span>
        </div>
        <pre className="px-4 py-3 text-xs font-mono text-green-400 leading-relaxed overflow-x-auto whitespace-pre-wrap">
          {step.content}
        </pre>
      </div>
      {step.caption && (
        <p className="text-[11px] text-gray-500 mt-1 italic">{step.caption}</p>
      )}
    </div>
  );
}

function TextBlock({ step }: { step: ContentStep }) {
  return (
    <div className="mb-4">
      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
        {step.content}
      </p>
      {step.caption && (
        <p className="text-[11px] text-gray-500 mt-1 italic">{step.caption}</p>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ScenarioViewer() {
  const content = getStage0Content();
  const { activeExperimentId, setActiveExperimentId } = useExperimentStore();

  const stage0Exps = ALL_EXPERIMENTS.filter((e) => e.stage === 0);
  const currentIndex = stage0Exps.findIndex((e) => e.id === activeExperimentId);
  const currentExp = activeExperimentId ? experimentById(activeExperimentId) : undefined;

  if (!currentExp || currentIndex === -1) return null;

  // Extract scenario ID (e.g. "000-next-token" → "000")
  const scenarioId = currentExp.id.split('-')[0];
  const scenario = content.scenarios[scenarioId];

  if (!scenario) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <p className="text-sm font-mono">Content not found for scenario {scenarioId}</p>
      </div>
    );
  }

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < stage0Exps.length - 1;

  const goToPrev = () => {
    if (hasPrev) setActiveExperimentId(stage0Exps[currentIndex - 1].id);
  };

  const goToNext = () => {
    if (hasNext) setActiveExperimentId(stage0Exps[currentIndex + 1].id);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Scenario Header ─────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                {scenarioId}
              </span>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {scenario.title}
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {scenario.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrev}
              disabled={!hasPrev}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={14} />
              Prev
            </button>
            <button
              onClick={goToNext}
              disabled={!hasNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Split Pane: Left (Surface) / Right (Truth) ──────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── LEFT: Surface Appearance ──────────────────────── */}
        <div className="flex-1 overflow-y-auto border-r border-gray-200 dark:border-gray-800">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={16} className="text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {scenario.leftPanel.label}
              </h3>
            </div>
            <div className="space-y-1">
              {scenario.leftPanel.steps.map((step, i) => (
                <ContentStepBlock key={i} step={step} />
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: The Truth ───────────────────────────────── */}
        <div className="w-[420px] shrink-0 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
          <div className="px-5 py-4 space-y-5">
            {/* Panel label */}
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-purple-400" />
              <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                {scenario.rightPanel.label}
              </h3>
            </div>

            {/* Core insight */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
              <p className="text-sm text-purple-100 font-medium leading-relaxed">
                {scenario.rightPanel.insight}
              </p>
            </div>

            {/* Detailed explanation */}
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {scenario.rightPanel.explanation}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700" />

            {/* 💡 Takeaway */}
            <div className="flex items-start gap-2">
              <Lightbulb size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300 font-medium leading-relaxed">
                {scenario.takeaway}
              </p>
            </div>

            {/* 🔗 Teaser */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {scenario.teaser.text}
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
                → {scenario.teaser.targetStage} · {scenario.teaser.targetConcept}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
