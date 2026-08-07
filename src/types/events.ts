// ── Event Types ─────────────────────────────────────────────────────────────

export type AgentEventType =
  | 'MODEL_CALL'
  | 'CONTEXT_BUILD'
  | 'PLAN_GENERATE'
  | 'TOOL_SELECT'
  | 'TOOL_EXECUTE'
  | 'OBSERVATION_RECEIVE'
  | 'STATE_UPDATE'
  | 'VERIFY'
  | 'LOOP_STOP';

export interface AgentEvent {
  id: string;
  timestamp: number; // ms from run start
  type: AgentEventType;
  nodeId: string; // which node generated this event
  payload: Record<string, unknown>;
  // MODEL_CALL:       { prompt, tokensUsed, modelId, temperature }
  // CONTEXT_BUILD:    { systemPrompt, memoryCount, toolCount, tokenCount }
  // PLAN_GENERATE:    { stepCount, steps: string[] }
  // TOOL_SELECT:      { toolName, args, confidence }
  // TOOL_EXECUTE:     { toolName, input, output, success, error? }
  // OBSERVATION_RECEIVE: { source, data, isStale }
  // STATE_UPDATE:     { key, oldValue, newValue }
  // VERIFY:           { check, passed, evidence? }
  // LOOP_STOP:        { iterations, reason, evidence? }
}

// ── Snapshots ───────────────────────────────────────────────────────────────

export interface StateSnapshot {
  step: number;
  goal: string;
  belief: Record<string, unknown>; // what the agent thinks is true
  reality: Record<string, unknown>; // actual environment state
}

export interface ContextSnapshot {
  step: number;
  systemPrompt: string;
  memory: Array<{ role: string; content: string }>;
  workspace: Record<string, string>; // filename → content
  tools: Array<{ name: string; description: string }>;
  tokenCount: number;
  tokenLimit: number;
}

export interface EnvironmentSnapshot {
  step: number;
  fileSystem: Record<string, string>;
  testResults: Array<{ name: string; passed: boolean; error?: string }>;
  toolRegistry: string[];
}

// ── Trace (the canonical run output) ────────────────────────────────────────

export interface Trace {
  traceId: string;
  seed: number;
  status: 'SUCCESS' | 'FAILED';
  failureReason: string | null;
  totalTokens: number;
  events: AgentEvent[];
  stateSnapshots: StateSnapshot[];
  contextSnapshots: ContextSnapshot[];
  environmentSnapshots: EnvironmentSnapshot[];
}

// ── Monte Carlo ─────────────────────────────────────────────────────────────

export interface TraceMonteCarloResult {
  successRate: number; // 0–1
  avgTokens: number;
  failureDistribution: Record<string, number>;
  sampleTraces: Trace[];
  runs: number;
}
