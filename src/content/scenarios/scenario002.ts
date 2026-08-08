import type { Scenario } from '../schema';

export const scenario002: Scenario = {
  def: {
    id: 'scenario-002',
    order: 2,
    stage: 'harness',
    hiddenFailure: 'tool-failure',
    baseSuccess: 0.30,
    capabilityEffects: { 'tool-contract': 0.15, 'retry-policy': 0.30 },
    requiredCapabilities: ['tool-contract', 'retry-policy'],
    unlocks: ['tool-contract', 'retry-policy'],
    baseTokenCost: 2400,
    trials: 200,
  },
  content: {
    title: { en: 'Tool Failure', zh: '工具故障' },
    mission: {
      en: 'Give the agent a real tool, then watch it call the wrong API with wrong parameters and no fallback.',
      zh: '给 Agent 一个真正的工具，看着它用错参数、调错 API、没有兜底。',
    },
    failureName: { en: 'TOOL_FAILURE', zh: 'TOOL FAILURE（工具故障）' },
    failureNarrative: {
      en: 'The API times out, the argument format is invalid, and the agent panics and stops.',
      zh: 'API 超时、参数格式错误，Agent 慌乱中直接停掉。',
    },
    missingCapabilityHint: {
      en: 'A tool is not just a function call. It needs a contract and a retry policy.',
      zh: 'Tool 不是一次函数调用。它需要 Contract 和 Retry Policy。',
    },
    explanation: {
      en: 'Tool Contract defines parameters, validation, and error semantics. Retry Policy adds exponential backoff with a limit. Together they turn brittle calls into reliable actions. Success rate: 30% → 75%.',
      zh: 'Tool Contract 定义参数、校验与错误语义；Retry Policy 提供指数退避与上限。两者把脆弱调用变成可靠动作。成功率：30% → 75%。',
    },
    patternName: { en: 'Resilient Tools (Contract + Retry)', zh: '弹性工具（Contract + Retry）' },
    patternSummary: {
      en: 'Treat every tool like an external service: write the contract, validate inputs, and retry transient failures.',
      zh: '把每个工具当外部服务：写好契约、校验输入、重试瞬态失败。',
    },
  },
};
