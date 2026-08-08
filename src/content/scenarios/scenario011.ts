import type { Scenario } from '../schema';

export const scenario011: Scenario = {
  def: {
    id: 'scenario-011',
    order: 11,
    stage: 'loop',
    hiddenFailure: 'false-completion',
    baseSuccess: 0.15,
    capabilityEffects: { 'evidence-loop': 0.70 },
    requiredCapabilities: ['evidence-loop'],
    unlocks: ['evidence-loop'],
    baseTokenCost: 5600,
    trials: 200,
  },
  content: {
    title: { en: 'False Completion', zh: '虚假完成' },
    mission: {
      en: 'The agent says the fix is done, but the tests have not run and the task is not verified.',
      zh: 'Agent 说“改完了”，但测试还没跑，任务未被验证。',
    },
    failureName: { en: 'FALSE_COMPLETION', zh: 'FALSE COMPLETION（虚假完成）' },
    failureNarrative: {
      en: 'The agent confidently declares completion while every test still fails and the bug remains.',
      zh: 'Agent 自信地宣布完成，但每个测试仍在失败，bug 还在。',
    },
    missingCapabilityHint: {
      en: 'Agent confidence is not task evidence. The loop must verify before it stops.',
      zh: 'Agent Confidence ≠ Task Evidence。循环必须在停止前先验证。',
    },
    explanation: {
      en: 'Root cause: the agent confuses its own confidence with real evidence. Evidence Loop replaces “I think I’m done” with a closed cycle: Action → Verification → Feedback → Next Action. After every action, the agent runs tests or checks, feeds the result back, and only continues or stops based on evidence. This turns false completion into measured progress. Success rate: 15% → 85%.',
      zh: '根因：Agent 把自信度当成真实证据。Evidence Loop 用闭环替代“我觉得做完了”：Action → Verification → Feedback → Next Action。每次动作后，Agent 运行测试或检查，把结果反馈回来，并只依据证据决定继续或停止。把虚假完成变成可衡量的进展。成功率：15% → 85%。',
    },
    patternName: { en: 'Evidence Loop', zh: '证据循环' },
    patternSummary: {
      en: 'Never stop because the model is confident. Stop because the evidence says the task is done.',
      zh: '不要因为模型自信就停止。要因为证据显示任务完成才停止。',
    },
  },
};
