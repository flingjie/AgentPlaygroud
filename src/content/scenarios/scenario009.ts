import type { Scenario } from '../schema';

export const scenario009: Scenario = {
  def: {
    id: 'scenario-009',
    order: 9,
    stage: 'loop',
    hiddenFailure: 'task-abandoned',
    baseSuccess: 0.25,
    capabilityEffects: { 'recovery-loop': 0.45 },
    requiredCapabilities: ['recovery-loop'],
    unlocks: ['recovery-loop'],
    baseTokenCost: 7400,
    trials: 200,
  },
  content: {
    title: { en: 'Task Abandoned', zh: '任务放弃' },
    mission: {
      en: 'The agent must fix ten bugs, but after one failure it stops and reports the whole task impossible.',
      zh: 'Agent 要修 10 个 bug，但失败一次就停下，报告整个任务不可能完成。',
    },
    failureName: { en: 'TASK_ABANDONED', zh: 'TASK ABANDONED（任务放弃）' },
    failureNarrative: {
      en: 'A single transient error kills the whole mission; no retry, no diagnosis, no continuation.',
      zh: '一次瞬态错误就杀死整个任务：没有重试、没有诊断、没有续跑。',
    },
    missingCapabilityHint: {
      en: 'One failure should not end the task. The agent needs a recovery loop.',
      zh: '一次失败不应终结任务。Agent 需要 Recovery Loop。',
    },
    explanation: {
      en: 'Recovery Loop is fail → diagnose → retry at the task level. It pairs retry policy with failure recovery so setbacks become progress. Success rate: 25% → 70%.',
      zh: 'Recovery Loop 是任务级的失败→诊断→重试。它把 Retry Policy 与 Failure Recovery 结合，让 setbacks 变成进展。成功率：25% → 70%。',
    },
    patternName: { en: 'Recovery Loop', zh: '恢复循环' },
    patternSummary: {
      en: 'When a step fails, diagnose first, then retry or reroute. Never abandon the whole task.',
      zh: '步骤失败时先诊断，再重试或改道。永远不要放弃整个任务。',
    },
  },
};
