import { useTranslation } from 'react-i18next';
import { useGame } from '../context/GameContext';
import type {
  LoopActionPolicy,
  LoopEvidence,
  LoopFeedback,
  LoopGoal,
  LoopStatePolicy,
  LoopStopOn,
  LoopTrigger,
} from '../types';

const TRIGGERS: LoopTrigger[] = ['on_task_start', 'on_test_fail'];
const GOALS: LoopGoal[] = ['tests_green', 'schema_valid'];
const STATE_POLICIES: LoopStatePolicy[] = [
  'stateless',
  'keep_last_error',
  'keep_run_summary',
];
const ACTION_POLICIES: LoopActionPolicy[] = [
  'retry_same',
  'edit_then_retest',
  'escalate_review',
];
const EVIDENCE: LoopEvidence[] = [
  'none',
  'test_runner',
  'schema_check',
  'reviewer_signoff',
];
const FEEDBACK: LoopFeedback[] = ['none', 'compact_error', 'reflexion'];
const STOP_ON: LoopStopOn[] = ['agent_says_done', 'evidence_pass', 'budget_or_max'];

function SelectField<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
  optionLabel,
}: {
  label: string;
  value: T;
  options: readonly T[];
  disabled: boolean;
  onChange: (v: T) => void;
  optionLabel: (v: T) => string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-500 dark:text-gray-400 font-mono uppercase tracking-wider">
        {label}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-200 font-mono focus:outline-none focus:border-purple-500 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {optionLabel(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function LoopConfigPanel() {
  const { t } = useTranslation();
  const { blueprint, updateLoop, selectedLevel } = useGame();
  const { loop } = blueprint;
  const unlocked = selectedLevel?.unlocked_loop ?? false;

  return (
    <div className="space-y-4">
      <h3 className="font-mono text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {t('loop.title')}
      </h3>

      <button
        disabled={!unlocked}
        onClick={() => updateLoop({ enabled: !loop.enabled })}
        className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all ${
          !unlocked
            ? 'border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30 opacity-40 cursor-not-allowed'
            : loop.enabled
              ? 'border-purple-500/30 bg-purple-400/5'
              : 'border-gray-300 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600'
        }`}
      >
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            !unlocked
              ? 'border-gray-300 dark:border-gray-700'
              : loop.enabled
                ? 'border-purple-400 bg-purple-400'
                : 'border-gray-400 dark:border-gray-600'
          }`}
        >
          {loop.enabled && (
            <svg
              className="w-3 h-3 text-white dark:text-gray-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div>
          <span
            className={`text-sm font-medium ${
              !unlocked
                ? 'text-gray-400 dark:text-gray-600'
                : loop.enabled
                  ? 'text-purple-600 dark:text-purple-300'
                  : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('loop.enabled')}
            {!unlocked && (
              <span className="ml-1 text-xs text-gray-400 dark:text-gray-600">
                ({t('common.locked')})
              </span>
            )}
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('loop.enabledDesc')}</p>
        </div>
      </button>

      {loop.enabled && unlocked && (
        <div className="space-y-3">
          <SelectField
            label={t('loop.evidence')}
            value={loop.evidence}
            options={EVIDENCE}
            disabled={false}
            onChange={(v) => updateLoop({ evidence: v })}
            optionLabel={(v) => t(`loop.evidenceOptions.${v}`)}
          />
          <SelectField
            label={t('loop.feedback')}
            value={loop.feedback}
            options={FEEDBACK}
            disabled={false}
            onChange={(v) => updateLoop({ feedback: v })}
            optionLabel={(v) => t(`loop.feedbackOptions.${v}`)}
          />
          <SelectField
            label={t('loop.stopOn')}
            value={loop.stop_on}
            options={STOP_ON}
            disabled={false}
            onChange={(v) => updateLoop({ stop_on: v })}
            optionLabel={(v) => t(`loop.stopOnOptions.${v}`)}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                {t('loop.maxIterations')}
              </label>
              <span className="font-mono text-sm text-purple-600 dark:text-purple-400">
                {loop.max_iterations}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={loop.max_iterations}
              onChange={(e) =>
                updateLoop({ max_iterations: parseInt(e.target.value) })
              }
              className="w-full h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-purple-400"
            />
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-600 font-mono">
              <span>1</span>
              <span>10</span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-3">
            <SelectField
              label={t('loop.trigger')}
              value={loop.trigger}
              options={TRIGGERS}
              disabled={false}
              onChange={(v) => updateLoop({ trigger: v })}
              optionLabel={(v) => t(`loop.triggerOptions.${v}`)}
            />
            <SelectField
              label={t('loop.goal')}
              value={loop.goal}
              options={GOALS}
              disabled={false}
              onChange={(v) => updateLoop({ goal: v })}
              optionLabel={(v) => t(`loop.goalOptions.${v}`)}
            />
            <SelectField
              label={t('loop.statePolicy')}
              value={loop.state_policy}
              options={STATE_POLICIES}
              disabled={false}
              onChange={(v) => updateLoop({ state_policy: v })}
              optionLabel={(v) => t(`loop.statePolicyOptions.${v}`)}
            />
            <SelectField
              label={t('loop.actionPolicy')}
              value={loop.action_policy}
              options={ACTION_POLICIES}
              disabled={false}
              onChange={(v) => updateLoop({ action_policy: v })}
              optionLabel={(v) => t(`loop.actionPolicyOptions.${v}`)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
