import { describe, it, expect } from 'vitest';
import { simulateMonteCarlo } from './monteCarlo';
import type { SimConfig } from '../types';

function makeConfig(): SimConfig {
  return {
    harness: {
      memory_capacity: 5,
      run_boundary_cap: 50000,
      has_tool_registry: true,
      has_retry_policy: true,
      has_timeout_guard: true,
      has_sandbox_isolation: true,
      has_context_manager: true,
      has_state_persistence: true,
      has_permission_layer: true,
    },
    loop: {
      enabled: true,
      trigger: 'on_test_fail',
      goal: 'tests_green',
      state_policy: 'stateless',
      action_policy: 'retry_same',
      evidence: 'test_runner',
      feedback: 'none',
      stop_on: 'evidence_pass',
      max_iterations: 3,
    },
  };
}

describe('simulateMonteCarlo', () => {
  it('produces an identical result for the same baseSeed and runs', () => {
    const config = makeConfig();
    const a = simulateMonteCarlo(config, 42, 50);
    const b = simulateMonteCarlo(config, 42, 50);
    expect(a).toEqual(b);
  });

  it('successRate is in [0, 1]', () => {
    const result = simulateMonteCarlo(makeConfig(), 1, 30);
    expect(result.successRate).toBeGreaterThanOrEqual(0);
    expect(result.successRate).toBeLessThanOrEqual(1);
  });

  it('failureDistribution sums to the number of FAILED runs', () => {
    const runs = 40;
    const result = simulateMonteCarlo(makeConfig(), 7, runs);
    const failed = runs - Math.round(result.successRate * runs);
    const distSum = Object.values(result.failureDistribution).reduce((a, b) => a + b, 0);
    expect(distSum).toBe(failed);
  });

  it('caps runs at 100', () => {
    const result = simulateMonteCarlo(makeConfig(), 3, 500);
    expect(result.runs).toBe(100);
  });

  it('samples at most 3 traces', () => {
    const result = simulateMonteCarlo(makeConfig(), 9, 100);
    expect(result.sampleTraces.length).toBeLessThanOrEqual(3);
  });
});
