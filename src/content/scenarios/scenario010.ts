import type { Scenario } from '../schema';

export const scenario010: Scenario = {
  def: {
    id: 'scenario-010',
    order: 10,
    stage: 'loop',
    hiddenFailure: 'infinite-loop',
    baseSuccess: 0.20,
    capabilityEffects: { 'stop-rule': 0.53 },
    requiredCapabilities: ['stop-rule'],
    unlocks: ['stop-rule'],
    baseTokenCost: 9100,
    trials: 200,
  },
  content: {
    title: { en: 'Infinite Loop Trap', zh: '无限循环陷阱' },
    mission: {
      en: 'The agent keeps trying the same failing approach, burning steps and budget forever.',
      zh: 'Agent 不断重复同一种失败方案，永远烧步骤和预算。',
    },
    failureName: { en: 'INFINITE_LOOP', zh: 'INFINITE LOOP（无限循环）' },
    failureNarrative: {
      en: 'Attempt fails, retry, attempt fails, retry — no progress check, no exit condition.',
      zh: '尝试失败、重试、再失败、再重试——没有进度检查，没有退出条件。',
    },
    missingCapabilityHint: {
      en: 'A loop without a stop rule is a trap. It needs max steps and progress checks.',
      zh: '没有 Stop Rule 的循环就是陷阱。需要 max steps 和进度检查。',
    },
    explanation: {
      en: 'Stop Rule sets hard limits: max steps, progress checks, and budget. If nothing improves, the loop stops and escalates. Success rate: 20% → 73%.',
      zh: 'Stop Rule 设置硬限制：max steps、进度检查、预算。如果毫无进展，循环停止并升级。成功率：20% → 73%。',
    },
    patternName: { en: 'Stop Rule', zh: '停止规则' },
    patternSummary: {
      en: 'Every loop needs a kill switch: bounded steps, measurable progress, and a budget ceiling.',
      zh: '每个循环都需要 killswitch：有界步骤、可衡量进度、预算上限。',
    },
  },
};
