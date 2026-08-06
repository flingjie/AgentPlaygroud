export interface HarnessConfig {
  has_tool_registry: boolean;
  has_retry_policy: boolean;
  has_timeout_guard: boolean;
  run_boundary_cap: number | null;
  has_sandbox_isolation: boolean;
  has_context_manager: boolean;
  has_state_persistence: boolean;
  has_permission_layer: boolean;
  memory_capacity: number; // 1-10
}

export type LoopStackTemplate = 'none' | 'single' | 'dual' | 'factory';
export interface LoopStackConfig {
  enabled: boolean;
  template: LoopStackTemplate;
}

export type LoopTrigger = 'on_task_start' | 'on_test_fail';
export type LoopGoal = 'tests_green' | 'schema_valid';
export type LoopStatePolicy = 'stateless' | 'keep_last_error' | 'keep_run_summary';
export type LoopActionPolicy = 'retry_same' | 'edit_then_retest' | 'escalate_review';
export type LoopEvidence = 'none' | 'test_runner' | 'schema_check' | 'reviewer_signoff';
export type LoopFeedback = 'none' | 'compact_error' | 'reflexion';
export type LoopStopOn = 'agent_says_done' | 'evidence_pass' | 'budget_or_max';

export interface LoopConfig {
  enabled: boolean;
  trigger: LoopTrigger;
  goal: LoopGoal;
  state_policy: LoopStatePolicy;
  action_policy: LoopActionPolicy;
  evidence: LoopEvidence;
  feedback: LoopFeedback;
  stop_on: LoopStopOn;
  max_iterations: number; // 1-10
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

export interface AgentBlueprint {
  level_id: string;
  run_seed?: number;
  harness: HarnessConfig;
  loop: LoopConfig;
  loop_stack: LoopStackConfig;
  graph: GraphSpec;
}

export interface TraceStep {
  step: number;
  node: string;
  action: string;
  status: 'SUCCESS' | 'FAIL';
  memory_used: number;
  warning?: string;
  reflection?: string;
}

export type FailureReason =
  | 'NONE'
  | 'HALLUCINATION'
  | 'TOOL_FAILURE'
  | 'FILE_CORROSION'
  | 'MEMORY_STACK_OVERFLOW'
  | 'CONTEXT_OVERFLOW'
  | 'STALE_CONTEXT'
  | 'FALSE_COMPLETION'
  | 'PERMISSION_ERROR'
  | 'DEADLOCK'
  | 'INFINITE_LOOP_TRAP'
  | 'BUDGET_EXHAUSTED'
  | 'TASK_ABANDONED'
  | 'UNSAFE_EXECUTION';

export interface TopologyInfo {
  kind: 'single' | 'chain' | 'parallel' | 'feedback';
  has_feedback: boolean;
  parallel_coders: number;
  isolated_nodes: string[];
}

export interface RunTrace {
  run_id: string;
  status: 'SUCCESS' | 'FAILED';
  failure_reason: FailureReason;
  cost_tokens: number;
  steps: TraceStep[];
  topology?: TopologyInfo | null;
}

export interface MonteCarloResult {
  success_rate: number;
  avg_tokens: number;
  failure_distribution: Record<FailureReason, number>;
  sample_traces: RunTrace[];
}

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

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
