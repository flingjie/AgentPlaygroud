import type { Scenario } from '../schema';

export const scenario003: Scenario = {
  def: {
    id: 'scenario-003',
    order: 3,
    stage: 'harness',
    hiddenFailure: 'unsafe-execution',
    baseSuccess: 0.40,
    capabilityEffects: { sandbox: 0.20, 'permission-gate': 0.10 },
    requiredCapabilities: ['sandbox', 'permission-gate'],
    unlocks: ['sandbox', 'permission-gate'],
    baseTokenCost: 3200,
    trials: 200,
  },
  content: {
    title: { en: 'Unsafe Execution', zh: '非安全执行' },
    mission: {
      en: 'Let the agent edit code without a sandbox, and watch it delete a production file.',
      zh: '让 Agent 在没有 Sandbox 的情况下改代码，看它删掉生产文件。',
    },
    failureName: { en: 'UNSAFE_EXECUTION', zh: 'UNSAFE EXECUTION（非安全执行）' },
    failureNarrative: {
      en: 'The agent runs a destructive command on the live host and wipes real data.',
      zh: 'Agent 在 live host 上执行破坏性命令，清除了真实数据。',
    },
    missingCapabilityHint: {
      en: 'An agent is not a trusted executor. It needs isolation and permission checks.',
      zh: 'Agent 不是可信执行体。它需要 Isolation 和 Permission Check。',
    },
    explanation: {
      en: 'Sandbox limits the blast radius; Permission Gate enforces least privilege and human confirmation. Agent actions must be bounded before they are trusted. Success rate: 40% → 70%.',
      zh: 'Sandbox 限制爆炸半径；Permission Gate 执行最小权限与人工确认。Agent 动作必须先被约束，再被信任。成功率：40% → 70%。',
    },
    patternName: { en: 'Safe Execution (Sandbox + Permission Gate)', zh: '安全执行（Sandbox + Permission Gate）' },
    patternSummary: {
      en: 'Never let an agent touch the real world without a sandbox and explicit permission gates.',
      zh: '永远不要让 Agent 在没有 Sandbox 和显式权限门的情况下触碰真实世界。',
    },
  },
};
