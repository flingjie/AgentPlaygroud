import type { Scenario } from '../schema';

export const scenario004: Scenario = {
  def: {
    id: 'scenario-004',
    order: 4,
    stage: 'harness',
    hiddenFailure: 'permission-error',
    baseSuccess: 0.35,
    capabilityEffects: { 'permission-gate': 0.25, 'tool-contract': 0.12 },
    requiredCapabilities: ['permission-gate'],
    unlocks: [],
    baseTokenCost: 2600,
    trials: 200,
  },
  content: {
    title: { en: 'Permission Error', zh: '权限错误' },
    mission: {
      en: 'Ask the agent to deploy a service, but it has no deploy role and no approval flow.',
      zh: '让 Agent 部署服务，但它没有部署角色，也没有审批流。',
    },
    failureName: { en: 'PERMISSION_ERROR', zh: 'PERMISSION ERROR（权限错误）' },
    failureNarrative: {
      en: 'The deployment fails because the agent lacks credentials, and no one authorized the action.',
      zh: '部署失败，因为 Agent 缺少凭据，且无人授权该动作。',
    },
    missingCapabilityHint: {
      en: 'Execution governance is not a single capability; it is combining what you already unlocked.',
      zh: '执行治理不是单一能力，而是把已解锁能力组合起来。',
    },
    explanation: {
      en: 'Governance means who can do what. Reusing Permission Gate from scenario 003 plus Tool Contract from scenario 002 turns a denied action into a controlled one. Success rate: 35% → 72%.',
      zh: 'Governance 即“谁能做什么”。复用 scenario 003 的 Permission Gate 与 scenario 002 的 Tool Contract，把被拒绝的动作变成受控动作。成功率：35% → 72%。',
    },
    patternName: { en: 'Execution Governance', zh: '执行治理' },
    patternSummary: {
      en: 'Combine capabilities into policy: identity, role, action contract, and explicit approval.',
      zh: '把能力组合成策略：身份、角色、动作契约、显式审批。',
    },
  },
};
