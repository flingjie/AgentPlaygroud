import type { AgentBlueprint, SimConfig } from '../types';

/**
 * The zero-config blueprint: a bare LLM with no harness, no loop, no graph.
 * Used by Stage 0's "Verify in Simulator" to demonstrate why a raw model
 * cannot be a production agent.
 *
 * Fixed seed = 42 ensures deterministic, reproducible output.
 */
export const RAW_MODEL_BLUEPRINT: AgentBlueprint = {
  level_id: 'level_0_model',
  harness: {
    has_tool_registry: false,
    has_retry_policy: false,
    has_timeout_guard: false,
    run_boundary_cap: null,
    has_sandbox_isolation: false,
    has_context_manager: false,
    has_state_persistence: false,
    has_permission_layer: false,
    memory_capacity: 1,
  },
  loop: {
    enabled: false,
    trigger: 'on_task_start',
    goal: 'tests_green',
    state_policy: 'stateless',
    action_policy: 'retry_same',
    evidence: 'none',
    feedback: 'none',
    stop_on: 'agent_says_done',
    max_iterations: 1,
  },
  loop_stack: {
    enabled: false,
    template: 'none',
  },
  graph: {
    state_schema: [],
    nodes: [{ id: 'coder', role: 'coder', state_writes: [] }],
    edges: [],
    entry: 'coder',
    checkpointing: false,
  },
  run_seed: 42,
};

/** The fixed seed used by RAW_MODEL_BLUEPRINT. */
export const RAW_MODEL_SEED = 42;

/**
 * Extract the SimConfig from an AgentBlueprint for use with simulateRun().
 */
export function toSimConfig(bp: AgentBlueprint): SimConfig {
  return {
    harness: bp.harness,
    loop: bp.loop,
    loopStack: bp.loop_stack,
    graph: bp.graph,
  };
}
