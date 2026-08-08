// src/content/schema.ts
export type StageId = 'llm' | 'harness' | 'loop' | 'graph' | 'reliability';

export type CapabilityId =
  | 'context-injection' | 'tool-registry' | 'tool-contract' | 'retry-policy'
  | 'sandbox' | 'permission-gate' | 'checkpointing' | 'memory-management'
  | 'context-engineering' | 'observation-loop' | 'recovery-loop' | 'stop-rule'
  | 'evidence-loop' | 'budget-guard' | 'graph-orchestration' | 'human-gate'
  | 'evaluation-harness' | 'observability-stack' | 'deterministic-replay';

export type FailureId =
  | 'hallucination' | 'tool-failure' | 'unsafe-execution' | 'permission-error'
  | 'state-corruption' | 'memory-failure' | 'context-overflow' | 'stale-context'
  | 'task-abandoned' | 'infinite-loop' | 'false-completion' | 'budget-exhausted'
  | 'deadlock'
  | 'evaluation-gap' | 'no-observability' | 'no-replay';

export interface LocalizedText { en: string; zh: string; }

export type EvidenceType = 'terminal' | 'file' | 'log' | 'metric' | 'thought' | 'api';

export interface Evidence {
  id: string;
  type: EvidenceType;
  title: LocalizedText;
  content: LocalizedText;
  isKeyEvidence: boolean;
}

export interface Hypothesis {
  id: string;
  text: LocalizedText;
  isCorrect: boolean;
  feedback: LocalizedText;
}

export interface InterventionParameter {
  key: string;
  label: LocalizedText;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  /** 相对 default 每 +1 step 的成功率修正（可负） */
  rateDeltaPerUnit: number;
}

export interface Intervention {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  configDiff: LocalizedText;
  parameters: InterventionParameter[];
  grantsCapabilities: CapabilityId[];
  isOptimal: boolean;
  tradeoff: LocalizedText;
}

export interface XRayToolCall {
  name: string;
  args: string;
  result: string | null;
}

export interface XRayAnnotation {
  text: LocalizedText;
  severity: 'info' | 'warn' | 'error';
}

export interface XRayIteration {
  step: number;
  context: { content: LocalizedText; usagePercent: number };
  prompt: { content: LocalizedText; tokens: number };
  decision: { content: LocalizedText; confidence: number };
  toolCalls: XRayToolCall[];
  observation: LocalizedText | null;
  memory: { shortTerm: LocalizedText[]; longTerm: LocalizedText[] };
  nextAction: LocalizedText;
  annotations: XRayAnnotation[];
}

export interface IncidentMeta {
  severity: 'P0' | 'P1' | 'P2';
  affectedSystems: LocalizedText[];
  reportedAt: string;
  alertSummary: LocalizedText;
  agentClaim: LocalizedText;
}

/** 数值 + 工单元数据（决定引擎行为） */
export interface IncidentDef {
  id: string;
  order: number;
  stage: StageId;
  hiddenFailure: FailureId;
  baseSuccess: number;
  capabilityEffects: Partial<Record<CapabilityId, number>>;
  unlocks: CapabilityId[];
  baseTokenCost: number;
  trials: number;
  incidentMeta: IncidentMeta;
}

export interface IncidentContent {
  title: LocalizedText;
  failureName: LocalizedText;
  explanation: LocalizedText;
  patternName: LocalizedText;
  patternSummary: LocalizedText;
  evidences: Evidence[];
  hypotheses: Hypothesis[];
  interventions: Intervention[];
  xrayTimeline: XRayIteration[];
}

export interface Incident {
  def: IncidentDef;
  content: IncidentContent;
}

/** @deprecated Use IncidentDef — will be removed in a future task */
export interface ScenarioDef {
  id: string;
  order: number;
  stage: StageId;
  hiddenFailure: FailureId;
  baseSuccess: number;
  capabilityEffects: Partial<Record<CapabilityId, number>>;
  requiredCapabilities: CapabilityId[];
  unlocks: CapabilityId[];
  baseTokenCost: number;
  trials: number;
}

/** @deprecated Use IncidentContent — will be removed in a future task */
export interface ScenarioContent {
  title: LocalizedText;
  mission: LocalizedText;
  failureName: LocalizedText;
  failureNarrative: LocalizedText;
  missingCapabilityHint: LocalizedText;
  explanation: LocalizedText;
  patternName: LocalizedText;
  patternSummary: LocalizedText;
}

/** @deprecated Use Incident — will be removed in a future task */
export interface Scenario { def: ScenarioDef; content: ScenarioContent; }
