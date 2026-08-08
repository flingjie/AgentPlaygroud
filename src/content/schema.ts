// src/content/schema.ts
export type StageId = 'harness' | 'loop' | 'graph';

export type CapabilityId =
  | 'context-injection' | 'tool-registry' | 'tool-contract' | 'retry-policy'
  | 'sandbox' | 'permission-gate' | 'checkpointing' | 'memory-management'
  | 'context-engineering' | 'observation-loop' | 'recovery-loop' | 'stop-rule'
  | 'evidence-loop' | 'budget-guard' | 'graph-orchestration' | 'human-gate';

export type FailureId =
  | 'hallucination' | 'tool-failure' | 'unsafe-execution' | 'permission-error'
  | 'state-corruption' | 'memory-failure' | 'context-overflow' | 'stale-context'
  | 'task-abandoned' | 'infinite-loop' | 'false-completion' | 'budget-exhausted'
  | 'deadlock';

export interface LocalizedText { en: string; zh: string; }

/** 数值模型：决定模拟结果（与文案分离） */
export interface ScenarioDef {
  id: string;                    // 'scenario-001'
  order: number;                 // 1..13，解锁顺序
  stage: StageId;
  hiddenFailure: FailureId;
  baseSuccess: number;           // 裸 Agent 成功率，如 0.08
  capabilityEffects: Partial<Record<CapabilityId, number>>; // 正确能力的加性提升
  requiredCapabilities: CapabilityId[];  // 通关条件：全部启用
  unlocks: CapabilityId[];       // 通关后进入全局库存
  baseTokenCost: number;         // 单次试验平均 token
  trials: number;                // Monte Carlo 次数，统一 200
}

/** 双语文案 */
export interface ScenarioContent {
  title: LocalizedText;
  mission: LocalizedText;            // 实验目标
  failureName: LocalizedText;        // 故障名，如 HALLUCINATION
  failureNarrative: LocalizedText;   // 故障发生时的叙事
  missingCapabilityHint: LocalizedText;
  explanation: LocalizedText;        // 学习点：为什么需要这个 Pattern
  patternName: LocalizedText;        // 导出 Pattern 名
  patternSummary: LocalizedText;
}

export interface Scenario { def: ScenarioDef; content: ScenarioContent; }
