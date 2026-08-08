import type { Scenario } from '../schema';

export const scenario012: Scenario = {
  def: {
    id: 'scenario-012',
    order: 12,
    stage: 'loop',
    hiddenFailure: 'budget-exhausted',
    baseSuccess: 0.30,
    capabilityEffects: { 'budget-guard': 0.47 },
    requiredCapabilities: ['budget-guard'],
    unlocks: ['budget-guard'],
    baseTokenCost: 12000,
    trials: 200,
  },
  content: {
    title: { en: 'Budget Exhausted', zh: '预算耗尽' },
    mission: {
      en: 'The agent runs unchecked, consuming tokens, time, and money until the ceiling is blown.',
      zh: 'Agent 无限制运行，消耗 token、时间和金钱，直到击穿上限。',
    },
    failureName: { en: 'BUDGET_EXHAUSTED', zh: 'BUDGET EXHAUSTED（预算耗尽）' },
    failureNarrative: {
      en: 'Costs spiral past the limit with no warning and no escalation path.',
      zh: '成本在无预警、无升级路径的情况下螺旋突破上限。',
    },
    missingCapabilityHint: {
      en: 'Execution needs guardrails: token caps, timeouts, and escalation.',
      zh: '执行需要护栏：token 上限、超时、升级机制。',
    },
    explanation: {
      en: 'Budget Guard enforces caps on tokens, time, and cost, and escalates when the limit is near. Controlled execution is reliable execution. Success rate: 30% → 77%.',
      zh: 'Budget Guard 对 token、时间、成本设置上限，并在接近上限时升级。受控执行才是可靠执行。成功率：30% → 77%。',
    },
    patternName: { en: 'Budget Guard', zh: '预算守卫' },
    patternSummary: {
      en: 'Set budgets before the loop starts, monitor them, and escalate when they are threatened.',
      zh: '在循环开始前设定预算，监控它们，在受威胁时升级。',
    },
  },
};
