import type { StateCreator } from 'zustand';
import type { HarnessConfig } from '../../types';

export interface ConfigSlice {
  harnessConfig: HarnessConfig;
  updateHarness: (partial: Partial<HarnessConfig>) => void;
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

export const createConfigSlice: StateCreator<ConfigSlice, [], []> = (set) => ({
  harnessConfig: defaultHarness,
  updateHarness: (partial) =>
    set((s) => ({ harnessConfig: { ...s.harnessConfig, ...partial } })),
});
