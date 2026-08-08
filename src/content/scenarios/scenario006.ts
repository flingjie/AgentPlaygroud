import type { Scenario } from '../schema';

export const scenario006: Scenario = {
  def: {
    id: 'scenario-006',
    order: 6,
    stage: 'harness',
    hiddenFailure: 'memory-failure',
    baseSuccess: 0.35,
    capabilityEffects: { 'memory-management': 0.39 },
    requiredCapabilities: ['memory-management'],
    unlocks: ['memory-management'],
    baseTokenCost: 5200,
    trials: 200,
  },
  content: {
    title: { en: 'Memory Failure', zh: '记忆故障' },
    mission: {
      en: 'The agent remembers wrong facts from earlier turns and keeps making the same bad decision.',
      zh: 'Agent 记住了前面轮次的错误信息，反复做出相同错误决策。',
    },
    failureName: { en: 'MEMORY_FAILURE', zh: 'MEMORY FAILURE（记忆故障）' },
    failureNarrative: {
      en: 'Outdated notes and noisy observations drown the signal, so the agent repeats the old mistake.',
      zh: '过时的笔记和嘈杂的观察淹没了信号，Agent 重蹈覆辙。',
    },
    missingCapabilityHint: {
      en: 'Memory is not more-is-better. It needs selection, compression, and validation.',
      zh: 'Memory 不是越多越好。它需要 Selection、Compression、Validation。',
    },
    explanation: {
      en: 'Memory Management selects what to keep, compresses it, and validates it against fresh observations. Bad memory is worse than no memory. Success rate: 35% → 74%.',
      zh: 'Memory Management 决定保留什么、压缩它、并用新观察校验。坏记忆比没有记忆更糟。成功率：35% → 74%。',
    },
    patternName: { en: 'Curated Memory', zh: '精选记忆' },
    patternSummary: {
      en: 'Store only what matters, compress it, and re-verify before reuse.',
      zh: '只存重要信息，压缩后，再用之前重新验证。',
    },
  },
};
