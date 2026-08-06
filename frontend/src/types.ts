export interface HarnessConfig {
  has_workspace: boolean;
  has_sandbox: boolean;
  has_git: boolean;
  memory_capacity: number; // 1-10
}

export interface LoopStrategy {
  type: 'none' | 'retry_blind' | 'react_reflexion';
  max_retries: number;
  stop_condition: 'none' | 'test_pass';
}

export interface GraphNode {
  id: string;
  role: 'planner' | 'coder' | 'reviewer' | 'tester';
  next: string[];
}

export interface AgentBlueprint {
  level_id: string;
  run_seed?: number;
  harness: HarnessConfig;
  loop_strategy: LoopStrategy;
  graph_nodes: GraphNode[];
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
  | 'HALLUCINATED_TOOL'
  | 'FILE_CORROSION'
  | 'MEMORY_STACK_OVERFLOW'
  | 'CONTEXT_FULL'
  | 'INFINITE_LOOP_TRAP'
  | 'TASK_ABANDONED';

export interface FailureEvent {
  reason: FailureReason;
  step: number;
}

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
  failure_events?: FailureEvent[];
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
  unlocked_harness: string[];
  unlocked_loop: boolean;
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

export const ALL_FAILURE_REASONS: FailureReason[] = [
  'HALLUCINATED_TOOL',
  'FILE_CORROSION',
  'MEMORY_STACK_OVERFLOW',
  'CONTEXT_FULL',
  'INFINITE_LOOP_TRAP',
  'TASK_ABANDONED',
];
