import type { Scenario } from '../schema';

export const scenario013: Scenario = {
  def: {
    id: 'scenario-013',
    order: 13,
    stage: 'graph',
    hiddenFailure: 'deadlock',
    baseSuccess: 0.10,
    capabilityEffects: { 'graph-orchestration': 0.55, 'human-gate': 0.17 },
    requiredCapabilities: ['graph-orchestration', 'human-gate'],
    unlocks: ['graph-orchestration', 'human-gate'],
    baseTokenCost: 15000,
    trials: 200,
  },
  content: {
    title: { en: 'Deadlock', zh: '死锁' },
    mission: {
      en: 'Planner, Reviewer, and Executor wait on each other forever, and no task advances.',
      zh: 'Planner、Reviewer、Executor 互相等待，永远没人推进任务。',
    },
    failureName: { en: 'DEADLOCK', zh: 'DEADLOCK（死锁）' },
    failureNarrative: {
      en: 'Each node holds a partial result and waits for another node to move first.',
      zh: '每个节点都拿着部分结果，等待另一个节点先动。',
    },
    missingCapabilityHint: {
      en: 'Multi-agent graphs need orchestration, state transitions, and recovery paths.',
      zh: '多 Agent 图需要 Orchestration、状态转移、恢复路径。',
    },
    explanation: {
      en: 'Graph Orchestration defines nodes, edges, and state transitions. Human Gate adds a decision point at critical bottlenecks. Together they break circular waits and expose a path forward. Success rate: 10% → 82%.',
      zh: 'Graph Orchestration 定义节点、边、状态转移；Human Gate 在关键瓶颈加入决策点。二者打破循环等待，暴露前进路径。成功率：10% → 82%。',
    },
    patternName: { en: 'Graph Engineering (Orchestration + Human Gate)', zh: '图工程（Orchestration + Human Gate）' },
    patternSummary: {
      en: 'Design multi-agent graphs like state machines: explicit transitions, recovery paths, and human gates at critical forks.',
      zh: '把多 Agent 图设计为状态机：显式转移、恢复路径、关键分叉处设人工关卡。',
    },
  },
};
