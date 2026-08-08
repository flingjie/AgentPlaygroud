import type { Scenario } from '../schema';

export const scenario001: Scenario = {
  def: {
    id: 'scenario-001',
    order: 1,
    stage: 'harness',
    hiddenFailure: 'hallucination',
    baseSuccess: 0.08,
    capabilityEffects: { 'context-injection': 0.22, 'tool-registry': 0.05 },
    requiredCapabilities: ['context-injection', 'tool-registry'],
    unlocks: ['context-injection', 'tool-registry'],
    baseTokenCost: 1800,
    trials: 200,
  },
  content: {
    title: { en: 'Hallucination', zh: '幻觉' },
    mission: {
      en: 'Ask a bare model-only agent to fix a real bug in a repo it cannot see.',
      zh: '让一个只有模型的裸 Agent 修复一个它根本看不到的仓库 bug。',
    },
    failureName: { en: 'HALLUCINATION', zh: 'HALLUCINATION（幻觉）' },
    failureNarrative: {
      en: 'The agent confidently replies "bug fixed" — without reading any code or touching any file.',
      zh: 'Agent 自信地回复“已修复”——但它没有读取任何代码，也没有修改任何文件。',
    },
    missingCapabilityHint: {
      en: 'The agent has no connection to the real world. It needs grounding.',
      zh: 'Agent 与真实世界完全断开。它需要的是 Grounding。',
    },
    explanation: {
      en: 'Grounding = connecting the agent to reality. Context Injection feeds it real files; a Tool Registry tells it what actions exist. Success rate: 8% → 35%.',
      zh: 'Grounding = 让 Agent 连接真实世界。Context Injection 喂给它真实文件，Tool Registry 告诉它有哪些动作可用。成功率：8% → 35%。',
    },
    patternName: { en: 'Grounding (Context + Tools)', zh: 'Grounding（上下文 + 工具）' },
    patternSummary: {
      en: 'Never trust a model-only answer. Inject real context and register callable tools before asking for work.',
      zh: '永远不要信任纯模型的回答。让它干活之前，先注入真实上下文、注册可调用工具。',
    },
  },
};
