import type { Scenario } from '../schema';

export const scenario007: Scenario = {
  def: {
    id: 'scenario-007',
    order: 7,
    stage: 'harness',
    hiddenFailure: 'context-overflow',
    baseSuccess: 0.28,
    capabilityEffects: { 'context-engineering': 0.48 },
    requiredCapabilities: ['context-engineering'],
    unlocks: ['context-engineering'],
    baseTokenCost: 6800,
    trials: 200,
  },
  content: {
    title: { en: 'Context Overflow', zh: '上下文溢出' },
    mission: {
      en: 'Stuff every file, log, and ticket into the prompt and watch the key detail vanish.',
      zh: '把所有文件、日志、工单都塞进 prompt，看着关键细节消失。',
    },
    failureName: { en: 'CONTEXT_OVERFLOW', zh: 'CONTEXT OVERFLOW（上下文溢出）' },
    failureNarrative: {
      en: 'The context window is full of noise, and the critical instruction is buried in the middle.',
      zh: 'Context Window 被噪声塞满，关键指令被埋在中间。',
    },
    missingCapabilityHint: {
      en: 'Not everything belongs in the prompt. Context Engineering decides what stays in and what stays out.',
      zh: '不是所有东西都要进 prompt。Context Engineering 决定什么进、什么留外面。',
    },
    explanation: {
      en: 'Context Engineering ranks, filters, and structures information. It keeps the window small where it matters and moves heavy context outside when possible. Success rate: 28% → 76%.',
      zh: 'Context Engineering 对信息排序、筛选、结构化。让窗口在关键处保持精简，把厚重上下文尽量外置。成功率：28% → 76%。',
    },
    patternName: { en: 'Context Engineering', zh: '上下文工程' },
    patternSummary: {
      en: 'Design the prompt like a dashboard: only what the agent needs, ranked by relevance.',
      zh: '把 prompt 设计成仪表盘：只放 Agent 需要的信息，按相关性排序。',
    },
  },
};
