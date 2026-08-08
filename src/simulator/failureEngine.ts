import type { HarnessConfig, LoopConfig, FailureReason, TraceAction, GraphSpec, TraceStep } from '../types';
import type { SeededRng } from './rng';

/**
 * Context for step-gated failure checking.
 */
export interface StepContext {
  harness: HarnessConfig;
  loop: LoopConfig;
  nodeRole: 'planner' | 'coder' | 'reviewer' | 'tester';
  stepCount: number;          // 1-based
  coderEdits: number;
  memoryUsed: number;
  staleLag: number;           // computed by caller
  hasGroundedLoop: boolean;   // loop.enabled && loop.evidence !== 'none'
}

/**
 * Per-action token cost table.
 */
export const ACTION_COST: Record<TraceAction, number> = {
  THINK: 1000,
  EDIT_FILE: 2500,
  RUN_TEST: 1500,
  RETRY: 800,
  CHECK_EVIDENCE: 500,
  STOP: 100,
};

/**
 * Context-overflow risk based on state_policy.
 * From engine.py: _context_full_risk
 */
export function contextFullRisk(statePolicy: LoopConfig['state_policy']): number {
  if (statePolicy === 'stateless') return 0.2;
  if (statePolicy === 'keep_last_error') return 0.55;
  if (statePolicy === 'keep_run_summary') return 0.75;
  return 0;
}

/**
 * Step-gated failure injection - per-node failure roll.
 * Returns FailureReason | null (first hit wins), using the SeededRng.
 * Order matters - matches engine.py _check_step_failure predicates.
 *
 * 1. HALLUCINATION: not has_tool_registry AND node.role=="coder"
 *    Rate: 0.65 (0.5 if sandbox enabled)
 * 2. TOOL_FAILURE: has_tool_registry AND coder AND NOT grounded loop
 *    Rate: 0.15
 * 3. FILE_CORROSION: not has_state_persistence AND coder AND edits >= 2
 *    Rate: 0.6
 * 4. MEMORY_STACK_OVERFLOW: stepCount >= 3 AND memory_capacity <= 3 AND memory >= cap
 *    Rate: 0.5
 * 5. CONTEXT_OVERFLOW: loop.enabled AND memory >= cap AND _context_full_risk > 0
 *    Rate: risk value (determined by state_policy)
 * 6. STALE_CONTEXT: not has_context_manager AND coder AND stale_lag >= 2
 *    Rate: 0.20
 * 7. PERMISSION_ERROR: has_tool_registry AND coder AND not has_permission_layer
 *    Gated on 0.20 roll
 * 8. UNSAFE_EXECUTION: has_tool_registry AND not has_sandbox_isolation
 *    Rate: 0.15
 */
export function checkStepFailure(ctx: StepContext, rng: SeededRng): FailureReason | null {
  const { harness, loop, nodeRole, stepCount, coderEdits, memoryUsed, staleLag, hasGroundedLoop } = ctx;

  // 1. HALLUCINATION: not has_tool_registry AND node.role=="coder"
  // Rate: 0.65 (0.5 if sandbox enabled)
  if (nodeRole === 'coder' && !harness.has_tool_registry) {
    const rate = harness.has_sandbox_isolation ? 0.5 : 0.65;
    if (rng.chance(rate)) return 'HALLUCINATION';
  }

  // 2. TOOL_FAILURE: has_tool_registry AND coder AND NOT grounded loop
  // Rate: 0.15
  if (nodeRole === 'coder' && harness.has_tool_registry && !hasGroundedLoop) {
    if (rng.chance(0.15)) return 'TOOL_FAILURE';
  }

  // 3. FILE_CORROSION: not has_state_persistence AND coder AND edits >= 2
  // Rate: 0.6
  if (nodeRole === 'coder' && !harness.has_state_persistence && coderEdits >= 2) {
    if (rng.chance(0.6)) return 'FILE_CORROSION';
  }

  // 4. MEMORY_STACK_OVERFLOW: stepCount >= 3 AND memory_capacity <= 3 AND memory >= cap
  // Rate: 0.5
  const memoryCapacity = harness.memory_capacity;
  if (stepCount >= 3 && memoryCapacity <= 3 && memoryUsed >= memoryCapacity) {
    if (rng.chance(0.5)) return 'MEMORY_STACK_OVERFLOW';
  }

  // 5. CONTEXT_OVERFLOW: loop.enabled AND memory >= cap AND _context_full_risk > 0
  // Rate: risk value (0.2 / 0.55 / 0.75 by state_policy)
  if (loop.enabled && memoryUsed >= memoryCapacity) {
    const risk = contextFullRisk(loop.state_policy);
    if (risk > 0 && rng.chance(risk)) return 'CONTEXT_OVERFLOW';
  }

  // 6. STALE_CONTEXT: not has_context_manager AND coder AND stale_lag >= 2
  // Rate: 0.20
  if (nodeRole === 'coder' && !harness.has_context_manager && staleLag >= 2) {
    if (rng.chance(0.20)) return 'STALE_CONTEXT';
  }

  // 7. PERMISSION_ERROR: has_tool_registry AND coder AND not has_permission_layer
  // Gated on 0.20 roll
  if (nodeRole === 'coder' && harness.has_tool_registry && !harness.has_permission_layer) {
    if (rng.chance(0.20)) return 'PERMISSION_ERROR';
  }

  // 8. UNSAFE_EXECUTION: has_tool_registry AND not has_sandbox_isolation
  // Rate: 0.15
  // Note: This is checked per step when tool_registry is present and sandbox is absent
  if (harness.has_tool_registry && !harness.has_sandbox_isolation) {
    if (rng.chance(0.15)) return 'UNSAFE_EXECUTION';
  }

  return null;
}

/**
 * Cross-cut injection - after all nodes run.
 * Covers:
 * - MEMORY_STACK_OVERFLOW: stepCount >= 3 AND memory_capacity <= 3 AND memory >= cap
 *   Rate: 0.3
 * - FILE_CORROSION: not has_state_persistence AND coder edits >= 2
 *   Rate: 0.4
 * - HALLUCINATION: not has_tool_registry
 *   Rate: 0.3
 */
export function checkCrossCutFailure(ctx: StepContext, rng: SeededRng): FailureReason | null {
  const { harness, coderEdits, memoryUsed } = ctx;
  const memoryCapacity = harness.memory_capacity;

  // MEMORY_STACK_OVERFLOW: stepCount >= 3 AND memory_capacity <= 3 AND memory >= cap
  // Cross-cut rate: 0.3
  if (ctx.stepCount >= 3 && memoryCapacity <= 3 && memoryUsed >= memoryCapacity) {
    if (rng.chance(0.3)) return 'MEMORY_STACK_OVERFLOW';
  }

  // FILE_CORROSION: not has_state_persistence AND coder edits >= 2
  // Cross-cut rate: 0.4
  if (!harness.has_state_persistence && coderEdits >= 2) {
    if (rng.chance(0.4)) return 'FILE_CORROSION';
  }

  // HALLUCINATION: not has_tool_registry
  // Cross-cut rate: 0.3
  if (!harness.has_tool_registry) {
    if (rng.chance(0.3)) return 'HALLUCINATION';
  }

  return null;
}

/**
 * Compute stale lag from step history.
 * state_version increments on each EDIT_FILE; observed_version is captured at the last
 * THINK or CHECK_EVIDENCE step. Lag = (state_version + in_flight_edits) - observed_version.
 */
export function staleLag(steps: TraceStep[], inFlightEdits?: number): number {
  let stateVersion = 0;
  let observedVersion = 0;
  const inFlight = inFlightEdits ?? 0;

  for (const step of steps) {
    if (step.action === 'EDIT_FILE') {
      stateVersion++;
    } else if (step.action === 'THINK' || step.action === 'CHECK_EVIDENCE') {
      observedVersion = stateVersion;
    }
  }

  return (stateVersion + inFlight) - observedVersion;
}

/**
 * Flow-level predicate: False completion would occur.
 * Returns true if stop_on === 'agent_says_done' (ungrounded stop).
 */
export function wouldFalseComplete(loop: LoopConfig): boolean {
  return loop.stop_on === 'agent_says_done';
}

/**
 * Flow-level predicate: Would trap due to no retry mechanism.
 * Returns true if loop enabled but harness has no retry_policy.
 * Note: This short-circuits the run before any steps execute.
 */
export function wouldTrapNoRetry(loop: LoopConfig, harness: HarnessConfig): boolean {
  return loop.enabled && !harness.has_retry_policy;
}

/**
 * Flow-level predicate: Task would be abandoned.
 * Returns true if no loop is enabled (single test failure ends the run).
 */
export function wouldAbandon(loop: LoopConfig): boolean {
  return !loop.enabled;
}

/**
 * Flow-level predicate: Budget has been exceeded.
 * Returns true if timeout_guard enabled AND run_boundary_cap is set AND cost exceeds cap.
 */
export function budgetExceeded(harness: HarnessConfig, tokenCost: number): boolean {
  return (
    !!harness.has_timeout_guard &&
    harness.run_boundary_cap != null &&
    tokenCost > harness.run_boundary_cap
  );
}

/**
 * Flow-level predicate: Structural deadlock detection.
 * Never probabilistic. Short-circuits before any node simulates.
 * Two structural conditions:
 * 1. A node that is unreachable from the effective entry point.
 * 2. A failure-condition edge (on_fail / on_review_reject) whose target has no outgoing edge.
 *
 * From engine.py: _detect_deadlock (lines ~747-783)
 */
export function hasStructuralDeadlock(graph: GraphSpec): boolean {
  const { nodes, edges, entry } = graph;

  if (!nodes || nodes.length === 0) {
    return false;
  }

  // Build adjacency list and track incoming edges
  const outgoing: Record<string, string[]> = {};
  const incoming: Record<string, string[]> = {};
  const nodeIds = new Set<string>();

  for (const node of nodes) {
    nodeIds.add(node.id);
    outgoing[node.id] = [];
    incoming[node.id] = [];
  }

  for (const edge of edges) {
    if (outgoing[edge.source]) {
      outgoing[edge.source].push(edge.target);
    }
    if (incoming[edge.target]) {
      incoming[edge.target].push(edge.source);
    }
  }

  // Determine effective entry point
  // Explicit entry if set, else node with no incoming edges
  let effectiveEntry: string | null = null;

  if (entry !== null && entry !== undefined && nodeIds.has(entry)) {
    effectiveEntry = entry;
  } else {
    // Find node with no incoming edges
    for (const nodeId of nodeIds) {
      if (incoming[nodeId].length === 0) {
        effectiveEntry = nodeId;
        break;
      }
    }
  }

  // If no entry found, we can't determine reachability - assume no deadlock
  if (effectiveEntry === null) {
    return false;
  }

  // Find all reachable nodes from effective entry via BFS
  const reachable = new Set<string>();
  const queue: string[] = [effectiveEntry];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!reachable.has(current)) {
      reachable.add(current);
      for (const target of outgoing[current] || []) {
        if (!reachable.has(target)) {
          queue.push(target);
        }
      }
    }
  }

  // Check condition 1: unreachable node
  for (const nodeId of nodeIds) {
    if (!reachable.has(nodeId)) {
      return true;
    }
  }

  // Check condition 2: failure-condition edge dead-ends with no recovery
  // A failure-condition edge (on_fail / on_review_reject) targets a node
  // with no outgoing edge - a failure state with no recovery path.
  for (const edge of edges) {
    if (edge.condition === 'on_fail' || edge.condition === 'on_review_reject') {
      const target = edge.target;
      // Check if target has no outgoing edges
      const targetOutgoing = outgoing[target] || [];
      if (targetOutgoing.length === 0) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Compute checkpoint recovery chance from state schema length.
 * From engine.py: min(0.9, 0.45 + 0.05 * len(state_schema))
 */
export function checkpointRecoveryChance(stateSchemaLen: number): number {
  return Math.min(0.9, 0.45 + 0.05 * stateSchemaLen);
}

/**
 * Compute harness quality score.
 * From engine.py: _harness_quality
 *
 * retry_policy is a GATE, not a booster.
 * Six effect dims + memory.
 *
 * return 0.1 * dims + 0.05 * min(harness.memory_capacity, 10)
 * where dims = (has_tool_registry + has_timeout_guard + has_sandbox_isolation
 *               + has_context_manager + has_state_persistence + has_permission_layer)
 */
export function harnessQuality(harness: HarnessConfig): number {
  const dims =
    (harness.has_tool_registry ? 1 : 0) +
    (harness.has_timeout_guard ? 1 : 0) +
    (harness.has_sandbox_isolation ? 1 : 0) +
    (harness.has_context_manager ? 1 : 0) +
    (harness.has_state_persistence ? 1 : 0) +
    (harness.has_permission_layer ? 1 : 0);

  return 0.1 * dims + 0.05 * Math.min(harness.memory_capacity ?? 10, 10);
}
