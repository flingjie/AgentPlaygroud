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
  [dimId: string]: boolean | number;
  memory_capacity: number;
  run_boundary_cap: number;
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

export interface TraceStep {
  step: number;
  action: TraceAction;
  status: 'SUCCESS' | 'FAIL';
  memoryUsed: number;
  node?: string;
  reflection?: string;
  warning?: string;
  costTokens: number;
}

export interface RunTrace {
  runId: string;
  seed: number;
  status: 'SUCCESS' | 'FAILED';
  failureReason: FailureReason | 'NONE';
  costTokens: number;
  topology: { kind: 'single' | 'chain' | 'parallel' | 'feedback'; hasFeedback: boolean; parallelCoders: number; isolatedNodes: string[] };
  steps: TraceStep[];
}

export interface MonteCarloResult {
  successRate: number;
  avgTokens: number;
  failureDistribution: Record<FailureReason, number>;
  sampleTraces: RunTrace[];
  runs: number;
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

export interface GraphNode {
  id: string;
  role: 'planner' | 'coder' | 'reviewer' | 'tester';
  state_writes: string[];
}

export interface GraphSpec {
  state_schema: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  entry: string | null;
  checkpointing: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
