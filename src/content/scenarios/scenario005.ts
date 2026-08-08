import type { Scenario } from '../schema';

export const scenario005: Scenario = {
  def: {
    id: 'scenario-005',
    order: 5,
    stage: 'harness',
    hiddenFailure: 'state-corruption',
    baseSuccess: 0.30,
    capabilityEffects: { checkpointing: 0.48 },
    requiredCapabilities: ['checkpointing'],
    unlocks: ['checkpointing'],
    baseTokenCost: 4100,
    trials: 200,
  },
  content: {
    title: { en: 'State Corruption', zh: '状态损坏' },
    mission: {
      en: 'The agent edits ten files, then crashes midway and leaves the repo half-broken.',
      zh: 'Agent 修改十个文件，中途崩溃，留下半坏的仓库。',
    },
    failureName: { en: 'STATE_CORRUPTION', zh: 'STATE CORRUPTION（状态损坏）' },
    failureNarrative: {
      en: 'Files are partially changed, tests are broken, and there is no clean state to return to.',
      zh: '文件只改了一半，测试全红，却没有干净状态可回退。',
    },
    missingCapabilityHint: {
      en: 'Long-running work needs persistence: snapshots, rollback, and resume.',
      zh: '长任务需要 Persistence：快照、回滚、断点续跑。',
    },
    explanation: {
      en: 'Checkpointing captures snapshots of work so the agent can resume or roll back safely. A stateful task without checkpoints is a gamble. Success rate: 30% → 78%.',
      zh: 'Checkpointing 捕获工作快照，让 Agent 安全续跑或回滚。没有检查点的状态任务就是赌博。成功率：30% → 78%。',
    },
    patternName: { en: 'State Persistence (Checkpointing)', zh: '状态持久化（Checkpointing）' },
    patternSummary: {
      en: 'Save clean snapshots before risky actions; always keep a rollback path.',
      zh: '在风险动作前保存干净快照；始终保留回滚路径。',
    },
  },
};
