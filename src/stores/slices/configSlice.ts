import type { StateCreator } from 'zustand';
import type { HarnessConfig, LoopConfig, LoopStackConfig, GraphSpec } from '../../types';

export interface ConfigSlice {
  harnessConfig: HarnessConfig;
  updateHarness: (partial: Partial<HarnessConfig>) => void;
  loopConfig: LoopConfig;
  updateLoop: (partial: Partial<LoopConfig>) => void;
  loopStackConfig: LoopStackConfig;
  updateLoopStack: (partial: Partial<LoopStackConfig>) => void;
  graphSpec: GraphSpec;
  updateGraph: (spec: Partial<GraphSpec>) => void;
}

const defaultHarness: HarnessConfig = {
  has_tool_registry: false,
  has_retry_policy: false,
  has_timeout_guard: false,
  run_boundary_cap: null,
  has_sandbox_isolation: false,
  has_context_manager: false,
  has_state_persistence: false,
  has_permission_layer: false,
  memory_capacity: 3,
};

const defaultLoop: LoopConfig = {
  enabled: false,
  trigger: 'on_test_fail',
  goal: 'tests_green',
  state_policy: 'stateless',
  action_policy: 'retry_same',
  evidence: 'none',
  feedback: 'none',
  stop_on: 'agent_says_done',
  max_iterations: 3,
};

const defaultLoopStack: LoopStackConfig = {
  enabled: false,
  template: 'none',
};

const defaultGraph: GraphSpec = {
  state_schema: [],
  nodes: [{ id: 'node_1', role: 'coder' as const, state_writes: [] }],
  edges: [],
  entry: 'node_1',
  checkpointing: false,
};

export const createConfigSlice: StateCreator<ConfigSlice, [], []> = (set) => ({
  harnessConfig: defaultHarness,
  updateHarness: (partial) =>
    set((s) => ({ harnessConfig: { ...s.harnessConfig, ...partial } })),
  loopConfig: defaultLoop,
  updateLoop: (partial) =>
    set((s) => ({ loopConfig: { ...s.loopConfig, ...partial } })),
  loopStackConfig: defaultLoopStack,
  updateLoopStack: (partial) =>
    set((s) => ({ loopStackConfig: { ...s.loopStackConfig, ...partial } })),
  graphSpec: defaultGraph,
  updateGraph: (spec) =>
    set((s) => ({ graphSpec: { ...s.graphSpec, ...spec } })),
});
