export type FailureReason =
  | 'HALLUCINATION' | 'TOOL_FAILURE' | 'FILE_CORROSION'
  | 'MEMORY_STACK_OVERFLOW' | 'CONTEXT_OVERFLOW' | 'STALE_CONTEXT'
  | 'FALSE_COMPLETION' | 'PERMISSION_ERROR' | 'DEADLOCK'
  | 'INFINITE_LOOP_TRAP' | 'BUDGET_EXHAUSTED' | 'TASK_ABANDONED'
  | 'UNSAFE_EXECUTION';

export type ReliabilityLayerId =
  | 'model' | 'tool' | 'workspace' | 'memory'
  | 'observation' | 'loop_discipline' | 'execution';

export type TraceAction = 'THINK' | 'EDIT_FILE' | 'RUN_TEST'
  | 'RETRY' | 'CHECK_EVIDENCE' | 'STOP';

export interface ReliabilityLayer {
  id: ReliabilityLayerId;
  question: string;
  order: number;
}

export interface HarnessDim {
  id: string;
  category: ReliabilityLayerId;
  nameKey: string;
  descKey: string;
  effect: {
    successRate: number;
    tokenCost: number;
    prevents: FailureReason[];
  };
  requires?: string[];
}

export interface HarnessConfig {
  has_tool_registry: boolean;
  has_retry_policy: boolean;
  has_timeout_guard: boolean;
  run_boundary_cap: number | null;
  has_sandbox_isolation: boolean;
  has_context_manager: boolean;
  has_state_persistence: boolean;
  has_permission_layer: boolean;
  memory_capacity: number;
}

export interface LoopConfig {
  enabled: boolean;
  trigger: 'on_task_start' | 'on_test_fail';
  goal: 'tests_green' | 'schema_valid';
  state_policy: 'stateless' | 'keep_last_error' | 'keep_run_summary';
  action_policy: 'retry_same' | 'edit_then_retest' | 'escalate_review';
  evidence: 'none' | 'test_runner' | 'schema_check' | 'reviewer_signoff';
  feedback: 'none' | 'compact_error' | 'reflexion';
  stop_on: 'agent_says_done' | 'evidence_pass' | 'budget_or_max';
  max_iterations: number;
}

export interface Scenario {
  id: string;
  name: string;
  failureRates: Partial<Record<FailureReason, number>>;
  costMultipliers: Partial<Record<TraceAction, number>>;
  inPlayFailures: FailureReason[];
  maxSteps: number;
}

export interface ExperimentSpec {
  id: string;
  title: string;
  scenario: Scenario;
  hiddenFailure: FailureReason;
  availableHarness: string[];
  loop: LoopConfig;
  evaluator: { targetSuccessRate: number; tokenBudget: number };
  baseline: { successRate: number; tokenCost: number; failureDistribution: Partial<Record<FailureReason, number>> };
}

// ── Loop sub-types (extracted from LoopConfig for component usage) ──────────

export type LoopTrigger = LoopConfig['trigger'];
export type LoopGoal = LoopConfig['goal'];
export type LoopStatePolicy = LoopConfig['state_policy'];
export type LoopActionPolicy = LoopConfig['action_policy'];
export type LoopEvidence = LoopConfig['evidence'];
export type LoopFeedback = LoopConfig['feedback'];
export type LoopStopOn = LoopConfig['stop_on'];

// ── Loop stack ──────────────────────────────────────────────────────────────

export interface LoopStackConfig {
  enabled: boolean;
  template: 'none' | 'single' | 'dual' | 'factory';
}

export type LoopStackTemplate = LoopStackConfig['template'];

// ── Graph ───────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  role: 'planner' | 'coder' | 'reviewer' | 'tester';
  state_writes: string[];
}

export type GraphEdgeCondition =
  | 'always'
  | 'on_pass'
  | 'on_fail'
  | 'on_review_reject'
  | 'on_human_approve';

export interface GraphEdge {
  source: string;
  target: string;
  condition: GraphEdgeCondition;
}

export interface GraphSpec {
  state_schema: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  entry: string | null;
  checkpointing: boolean;
}

// ── Agent blueprint (the canonical player design) ───────────────────────────

export interface AgentBlueprint {
  level_id: string;
  harness: HarnessConfig;
  loop: LoopConfig;
  loop_stack: LoopStackConfig;
  graph: GraphSpec;
  run_seed?: number;
}

// ── Level definition (from backend /api/levels) ─────────────────────────────

export interface LevelInfo {
  id: string;
  name: string;
  description: string;
  learning_label: string;
  unlocked_harness: string[];
  unlocked_loop: boolean;
  unlocked_loop_stack: boolean;
  unlocked_loop_templates: string[];
  unlocked_graph: boolean;
  target_success_rate: number;
  token_budget: number;
}

// ── Simulation results ──────────────────────────────────────────────────────

export interface TraceStep {
  step: number;
  node?: string;
  action: TraceAction;
  status: 'SUCCESS' | 'FAIL';
  memory_used: number;
  cost_tokens: number;
  reflection?: string;
  warning?: string;
}

export interface RunTrace {
  run_id: string;
  seed: number;
  status: 'SUCCESS' | 'FAILED';
  failure_reason: FailureReason | 'NONE';
  cost_tokens: number;
  topology: {
    kind: 'single' | 'chain' | 'parallel' | 'feedback';
    has_feedback: boolean;
    parallel_coders: number;
    isolated_nodes: string[];
  };
  steps: TraceStep[];
}

export interface MonteCarloResult {
  success_rate: number;
  avg_tokens: number;
  failure_distribution: Partial<Record<FailureReason, number>> & Record<string, number>;
  sample_traces: RunTrace[];
  runs: number;
}

// ── Legacy (kept for backward compat) ───────────────────────────────────────

export interface SimConfig {
  harness: HarnessConfig;
  loop: LoopConfig;
  loopStack?: LoopStackConfig;
  graph?: GraphSpec;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
