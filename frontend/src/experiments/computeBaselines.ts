import type {
  ExperimentSpec,
  FailureReason,
  HarnessConfig,
  LoopConfig,
  SimConfig,
  GraphSpec,
} from '../types';
import type { RawExperimentSpec } from './index';
import { simulateMonteCarlo } from '../simulator/monteCarlo';

/**
 * Baseline harness for each hidden failure — the configuration that makes the
 * failure REACHABLE (per engine-port-notes predicate prerequisites), so the
 * baseline shows the intended dominant failure rather than HALLUCINATION
 * drowning everything (which happens with an all-off harness, since missing
 * tool_registry injects HALLUCINATION at 0.65 first).
 *
 * Strategy: turn everything ON except the dimension whose absence is the
 * lesson, and give loop-dependent failures a grounded loop — so no other
 * failure (TOOL_FAILURE especially) pre-empts the target.
 */
export function baselineHarnessFor(hidden: FailureReason): HarnessConfig {
  const allOn: HarnessConfig = {
    memory_capacity: 5,
    run_boundary_cap: 50000,
    has_tool_registry: true,
    has_retry_policy: true,
    has_timeout_guard: true,
    has_sandbox_isolation: true,
    has_context_manager: true,
    has_state_persistence: true,
    has_permission_layer: true,
  };
  switch (hidden) {
    case 'HALLUCINATION':
      // bare model: no tool surface → HALLUCINATION
      return {
        memory_capacity: 5,
        run_boundary_cap: 50000,
        has_tool_registry: false,
        has_retry_policy: false,
        has_timeout_guard: false,
        has_sandbox_isolation: false,
        has_context_manager: false,
        has_state_persistence: false,
        has_permission_layer: false,
      };
    case 'TOOL_FAILURE':
      // registry ON but no grounded loop → real tool returns garbage (0.15)
      return { ...allOn, has_sandbox_isolation: true, has_permission_layer: true };
    case 'UNSAFE_EXECUTION':
      return { ...allOn, has_sandbox_isolation: false };
    case 'PERMISSION_ERROR':
      return { ...allOn, has_permission_layer: false };
    case 'FILE_CORROSION':
      return { ...allOn, has_state_persistence: false };
    case 'MEMORY_STACK_OVERFLOW':
      return { ...allOn, memory_capacity: 2 };
    case 'CONTEXT_OVERFLOW':
      // loop + keep_run_summary (0.75 risk) + small capacity
      return { ...allOn, memory_capacity: 3 };
    case 'STALE_CONTEXT':
      // high capacity so grounded-loop memory never reaches cap (avoids CONTEXT_OVERFLOW)
      return { ...allOn, has_context_manager: false, memory_capacity: 10 };
    case 'TASK_ABANDONED':
      // tester-only graph + no loop; single test fails → abandon
      return { ...allOn, memory_capacity: 1 };
    case 'INFINITE_LOOP_TRAP':
      // loop enabled but no retry mechanism → structural short-circuit
      return { ...allOn, has_retry_policy: false };
    case 'FALSE_COMPLETION':
      // stop_on=agent_says_done + no evidence → ungrounded stop
      return allOn;
    case 'BUDGET_EXHAUSTED':
      return { ...allOn, has_timeout_guard: true, run_boundary_cap: 1000 };
    case 'DEADLOCK':
      // graph with an unreachable node short-circuits structurally
      return {
        memory_capacity: 5,
        run_boundary_cap: 50000,
        has_tool_registry: true,
        has_retry_policy: true,
        has_timeout_guard: true,
        has_sandbox_isolation: true,
        has_context_manager: true,
        has_state_persistence: true,
        has_permission_layer: true,
      };
  }
}

/**
 * Loop config that must be enabled for the loop-dependent failures.
 */
export function baselineLoopFor(hidden: FailureReason): LoopConfig {
  const disabled: LoopConfig = {
    enabled: false,
    trigger: 'on_test_fail',
    goal: 'tests_green',
    state_policy: 'stateless',
    action_policy: 'retry_same',
    evidence: 'none',
    feedback: 'none',
    stop_on: 'evidence_pass',
    max_iterations: 3,
  };
  switch (hidden) {
    case 'CONTEXT_OVERFLOW':
      return {
        ...disabled,
        enabled: true,
        state_policy: 'keep_run_summary',
        action_policy: 'edit_then_retest',
        evidence: 'test_runner',
        feedback: 'reflexion',
        stop_on: 'evidence_pass',
        max_iterations: 3,
      };
    case 'INFINITE_LOOP_TRAP':
      return { ...disabled, enabled: true, stop_on: 'budget_or_max' };
    case 'FALSE_COMPLETION':
      return { ...disabled, enabled: true, stop_on: 'agent_says_done', evidence: 'none' };
    case 'TOOL_FAILURE':
      // registry present but NO grounded loop → TOOL_FAILURE possible
      return disabled;
    case 'UNSAFE_EXECUTION':
    case 'PERMISSION_ERROR':
    case 'FILE_CORROSION':
    case 'STALE_CONTEXT':
    case 'MEMORY_STACK_OVERFLOW':
      // grounded loop prevents TOOL_FAILURE pre-emption
      return {
        ...disabled,
        enabled: true,
        state_policy: 'stateless',
        evidence: 'test_runner',
        stop_on: 'evidence_pass',
      };
    default:
      return disabled;
  }
}

/**
 * Graph that structurally deadlocks (unreachable node) for the DEADLOCK experiment.
 */
function deadlockGraph(): GraphSpec {
  return {
    state_schema: [],
    nodes: [
      { id: 'node_1', role: 'planner', state_writes: [] },
      { id: 'node_2', role: 'coder', state_writes: [] },
      { id: 'node_3', role: 'coder', state_writes: [] },
    ],
    edges: [{ source: 'node_1', target: 'node_2', condition: 'always' }],
    entry: 'node_1',
    checkpointing: false,
  };
}

/**
 * Tester-only graph: no coder node → no coder step-gated failures, so a single
 * no-loop test failure cleanly produces TASK_ABANDONED.
 */
function testerGraph(): GraphSpec {
  return {
    state_schema: [],
    nodes: [{ id: 'node_1', role: 'tester', state_writes: [] }],
    edges: [],
    entry: 'node_1',
    checkpointing: false,
  };
}

function specToSimConfig(spec: RawExperimentSpec): SimConfig {
  const harness = baselineHarnessFor(spec.hiddenFailure);
  const loop = baselineLoopFor(spec.hiddenFailure);
  const config: SimConfig = { harness, loop };
  if (spec.hiddenFailure === 'DEADLOCK') {
    config.graph = deadlockGraph();
  } else if (spec.hiddenFailure === 'TASK_ABANDONED') {
    config.graph = testerGraph();
  }
  return config;
}

/**
 * Fill each experiment's `baseline` by running the engine on the baseline
 * config (seed 0, `runs` runs). The engine is deterministic, so the baseline
 * is computed (never hand-authored) and reproducible.
 */
export function computeBaselines(
  specs: RawExperimentSpec[],
  runs = 200
): ExperimentSpec[] {
  return specs.map((spec) => {
    const result = simulateMonteCarlo(specToSimConfig(spec), 0, runs);
    return {
      ...spec,
      baseline: {
        successRate: result.success_rate,
        tokenCost: result.avg_tokens,
        failureDistribution: { ...result.failure_distribution },
      },
    };
  }) as ExperimentSpec[];
}

/**
 * Assert the pedagogy property: each experiment's baseline has its hidden
 * failure as the dominant failure reason. Returns failures as [{id, hidden, top}].
 */
export function assertBaselineDominance(
  specs: ExperimentSpec[]
): { id: string; hidden: FailureReason; top: FailureReason | string; topCount: number }[] {
  const failures: { id: string; hidden: FailureReason; top: FailureReason | string; topCount: number }[] = [];
  for (const spec of specs) {
    const dist = spec.baseline.failureDistribution;
    let top: FailureReason | string = 'NONE';
    let topCount = 0;
    for (const [reason, count] of Object.entries(dist)) {
      if ((count ?? 0) > topCount) {
        top = reason as FailureReason;
        topCount = count ?? 0;
      }
    }
    if (top !== spec.hiddenFailure) {
      failures.push({ id: spec.id, hidden: spec.hiddenFailure, top, topCount });
    }
  }
  return failures;
}
