import type { Scenario } from '../schema';

export const scenario008: Scenario = {
  def: {
    id: 'scenario-008',
    order: 8,
    stage: 'harness',
    hiddenFailure: 'stale-context',
    baseSuccess: 0.33,
    capabilityEffects: { 'observation-loop': 0.46 },
    requiredCapabilities: ['observation-loop'],
    unlocks: ['observation-loop'],
    baseTokenCost: 3900,
    trials: 200,
  },
  content: {
    title: { en: 'Stale Context', zh: '上下文过期' },
    mission: {
      en: 'The world changes while the agent plans, but the agent never refreshes its view.',
      zh: 'Agent 规划时真实世界已经变化，但它从未刷新视图。',
    },
    failureName: { en: 'STALE_CONTEXT', zh: 'STALE CONTEXT（上下文过期）' },
    failureNarrative: {
      en: 'The agent acts on yesterday\'s data, missing a change that happened minutes ago.',
      zh: 'Agent 按昨天的数据行动，漏掉了几分钟前发生的变化。',
    },
    missingCapabilityHint: {
      en: 'The agent\'s view of the world is not the real world. It needs refresh and re-fetch.',
      zh: 'Agent 看到的世界 ≠ 真实世界。它需要 Refresh 与 Re-fetch。',
    },
    explanation: {
      en: 'Observation Loop periodically re-checks external state. It closes the gap between the agent\'s cached model and reality before a decision is made. Success rate: 33% → 79%.',
      zh: 'Observation Loop 定期重新检查外部状态。在决策前弥合 Agent 缓存模型与真实世界的差距。成功率：33% → 79%。',
    },
    patternName: { en: 'Observation Loop', zh: '观察循环' },
    patternSummary: {
      en: 'Before each key action, re-fetch the facts that matter from the real world.',
      zh: '在每个关键动作前，从真实世界重新获取重要事实。',
    },
  },
};
