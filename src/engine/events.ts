// Task 10 completes this table for all 13 FailureIds and switches back to a full Record.
import type { CapabilityId, FailureId, LocalizedText, ScenarioDef } from '../content/schema';
import type { TrialResult } from './simulator';

const FAILURE_STORY: Partial<Record<FailureId, {
  setup: LocalizedText;
  failure: LocalizedText;
  mitigation: LocalizedText;
}>> = {
  hallucination: {
    setup: { en: 'Agent prepares to answer the fix conclusion directly', zh: 'Agent 准备直接回答修复结论' },
    failure: { en: 'Confidently claims the fix is done without reading any code', zh: '自信宣称已修复但未读任何代码' },
    mitigation: { en: 'Context Injection took effect, reading real files', zh: 'Context Injection 生效，读取了真实文件' },
  },
};

export type EventKind = 'trigger' | 'thought' | 'action' | 'tool-call' | 'failure' | 'mitigation' | 'verdict';

export interface RunEvent {
  step: number;
  kind: EventKind;
  text: LocalizedText;
}

export function buildTimeline(
  scenario: ScenarioDef,
  result: TrialResult,
  enabled: ReadonlySet<CapabilityId>,
): RunEvent[] {
  const story = FAILURE_STORY[scenario.hiddenFailure];
  if (!story) {
    throw new Error(`missing failure story: ${scenario.hiddenFailure}`);
  }

  const covered = scenario.requiredCapabilities.every(c => enabled.has(c));
  const events: RunEvent[] = [
    { step: 1, kind: 'trigger', text: { en: 'Task received', zh: '收到任务' } },
  ];

  for (let i = 0; i < result.steps; i++) {
    const step = 2 + i;
    const kind = i % 2 === 0 ? 'thought' : 'action';
    const text = kind === 'thought'
      ? story.setup
      : { en: 'Agent acts on the task', zh: 'Agent 开始执行' };
    events.push({ step, kind, text });
  }

  if (!result.success) {
    events.push({ step: 2 + result.steps, kind: 'failure', text: story.failure });
  } else if (covered) {
    events.push({ step: 2 + result.steps, kind: 'mitigation', text: story.mitigation });
  }

  const hasFailureOrMitigation = !result.success || covered;
  const verdictStep = 2 + result.steps + (hasFailureOrMitigation ? 1 : 0);
  events.push({
    step: verdictStep,
    kind: 'verdict',
    text: result.success
      ? { en: 'Task succeeded', zh: '任务成功' }
      : { en: 'Task failed', zh: '任务失败' },
  });

  return events;
}
