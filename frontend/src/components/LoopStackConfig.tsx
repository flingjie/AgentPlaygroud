import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { useGame } from '../context/GameContext';
import type { LoopStackTemplate } from '../types';

const TEMPLATES: Record<string, { fields: { labelKey: string; value: string; whyKey: string }[] }> = {
  single: {
    fields: [
      { labelKey: 'loop.trigger', value: 'on_task_start', whyKey: 'loopStack.why.trigger' },
      { labelKey: 'loop.goal', value: 'tests_green', whyKey: 'loopStack.why.goal' },
      { labelKey: 'loop.evidence', value: 'test_runner', whyKey: 'loopStack.why.evidence' },
      { labelKey: 'loop.feedback', value: 'reflexion', whyKey: 'loopStack.why.feedback' },
      { labelKey: 'loop.stopOn', value: 'evidence_pass', whyKey: 'loopStack.why.stopOn' },
      { labelKey: 'loop.maxIterations', value: '3', whyKey: 'loopStack.why.maxIterations' },
    ],
  },
  dual: {
    fields: [
      { labelKey: 'loopStack.inner', value: 'verify (max 3)', whyKey: 'loopStack.why.inner' },
      { labelKey: 'loopStack.outer', value: 'improve (max 5)', whyKey: 'loopStack.why.outer' },
      { labelKey: 'loopStack.innerEvidence', value: 'test_runner', whyKey: 'loopStack.why.innerEvidence' },
      { labelKey: 'loopStack.outerEvidence', value: 'reviewer_signoff', whyKey: 'loopStack.why.outerEvidence' },
    ],
  },
  factory: {
    fields: [
      { labelKey: 'loopStack.plan', value: 'planner', whyKey: 'loopStack.why.plan' },
      { labelKey: 'loopStack.build', value: 'coder', whyKey: 'loopStack.why.build' },
      { labelKey: 'loopStack.test', value: 'tester', whyKey: 'loopStack.why.test' },
      { labelKey: 'loopStack.review', value: 'reviewer', whyKey: 'loopStack.why.review' },
      { labelKey: 'loopStack.release', value: 'release', whyKey: 'loopStack.why.release' },
    ],
  },
};

function TemplateOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all ${
        selected
          ? 'border-purple-500/30 bg-purple-400/5'
          : 'border-gray-300 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600'
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          selected ? 'border-purple-400' : 'border-gray-400 dark:border-gray-600'
        }`}
      >
        {selected && <span className="w-2 h-2 rounded-full bg-purple-400" />}
      </span>
      <span
        className={`text-sm font-medium ${
          selected ? 'text-purple-600 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export default function LoopStackConfigPanel() {
  const { t } = useTranslation();
  const { blueprint, updateLoopStack, selectedLevel } = useGame();
  const { loop_stack } = blueprint;

  const unlocked = selectedLevel?.unlocked_loop_stack ?? false;
  if (!unlocked) return null;

  const showFactory = (selectedLevel?.unlocked_loop_templates ?? []).includes('factory');
  const selected: LoopStackTemplate = loop_stack.enabled ? loop_stack.template : 'none';
  const fields = selected !== 'none' ? TEMPLATES[selected]?.fields ?? [] : [];

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('loopStack.title')}
      </h3>

      <div className="space-y-2">
        <label className="text-xs text-gray-500 dark:text-gray-400 font-mono uppercase tracking-wider">
          {t('loopStack.template')}
        </label>

        <TemplateOption
          label={t('loop.evidenceOptions.none')}
          selected={selected === 'none'}
          onSelect={() => updateLoopStack({ enabled: false, template: 'none' })}
        />
        <TemplateOption
          label={t('loopStack.single')}
          selected={selected === 'single'}
          onSelect={() => updateLoopStack({ enabled: true, template: 'single' })}
        />
        <TemplateOption
          label={t('loopStack.dual')}
          selected={selected === 'dual'}
          onSelect={() => updateLoopStack({ enabled: true, template: 'dual' })}
        />
        {showFactory && (
          <TemplateOption
            label={t('loopStack.factory')}
            selected={selected === 'factory'}
            onSelect={() => updateLoopStack({ enabled: true, template: 'factory' })}
          />
        )}
      </div>

      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map((field) => (
            <div
              key={field.labelKey}
              className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono uppercase tracking-wider">
                  {t(field.labelKey)}
                </span>
                <span className="font-mono text-xs text-purple-600 dark:text-purple-400">
                  {field.value}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t(field.whyKey)}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-600 flex items-center gap-1">
                <Lock size={10} className="shrink-0" />
                {t('loopStack.lockedNote')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
