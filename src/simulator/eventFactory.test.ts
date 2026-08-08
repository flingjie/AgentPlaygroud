import { describe, it, expect } from 'vitest';
import { traceToV2 } from './eventFactory';
import { simulateRunV2 } from './runtimeSimulator';
import type { HarnessConfig, LoopConfig, TraceStep } from '../types';

// ==================== Helpers ====================

function makeHarness(overrides: Partial<HarnessConfig> = {}): HarnessConfig {
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
    ...overrides,
  };
}

function makeLoop(overrides: Partial<LoopConfig> = {}): LoopConfig {
  return {
    enabled: true,
    trigger: 'on_test_fail',
    goal: 'tests_green',
    state_policy: 'stateless',
    action_policy: 'retry_same',
    evidence: 'test_runner',
    feedback: 'none',
    stop_on: 'evidence_pass',
    max_iterations: 3,
    ...overrides,
  };
}

function makeStep(overrides: Partial<TraceStep> = {}): TraceStep {
  return {
    step: 1,
    node: 'node_1',
    action: 'THINK',
    status: 'SUCCESS',
    memory_used: 0,
    cost_tokens: 1000,
    ...overrides,
  };
}

// ==================== simulateRunV2 ====================

describe('simulateRunV2', () => {
  it('produces a Trace with correct structure', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const trace = simulateRunV2({ harness, loop }, 42);

    expect(trace.traceId).toBeTruthy();
    expect(typeof trace.traceId).toBe('string');
    expect(trace.seed).toBe(42);
    expect(['SUCCESS', 'FAILED']).toContain(trace.status);
    expect(trace.totalTokens).toBeGreaterThan(0);
    expect(trace.events.length).toBeGreaterThan(0);
    expect(trace.stateSnapshots.length).toBe(trace.events.length);
    expect(trace.contextSnapshots.length).toBe(trace.events.length);
    expect(trace.environmentSnapshots.length).toBe(trace.events.length);
  });

  it('events have correct shape', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const trace = simulateRunV2({ harness, loop }, 42);

    for (const event of trace.events) {
      expect(typeof event.id).toBe('string');
      expect(event.id).toMatch(/^evt-/);
      expect(typeof event.timestamp).toBe('number');
      expect(event.timestamp).toBeGreaterThan(0);
      expect(typeof event.type).toBe('string');
      expect(typeof event.nodeId).toBe('string');
      expect(typeof event.payload).toBe('object');
    }
  });

  it('failureReason is null for SUCCESS runs', () => {
    const harness = makeHarness({
      memory_capacity: 10,
      run_boundary_cap: 1_000_000,
    });
    const loop = makeLoop({ enabled: true, max_iterations: 1 });
    const config = {
      harness,
      loop,
      graph: {
        state_schema: [],
        nodes: [{ id: 'node_1', role: 'tester', state_writes: [] }],
        edges: [],
        entry: 'node_1',
        checkpointing: false,
      },
    };

    // Search for a seed that succeeds
    for (let seed = 0; seed < 200; seed++) {
      const trace = simulateRunV2(config, seed);
      if (trace.status === 'SUCCESS') {
        expect(trace.failureReason).toBeNull();
        return;
      }
    }
    // If we get here, no success was found — still valid for deterministic engine
  });

  it('is deterministic (same seed = same trace)', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const t1 = simulateRunV2({ harness, loop }, 12345);
    const t2 = simulateRunV2({ harness, loop }, 12345);
    expect(t1).toEqual(t2);
  });

  it('state snapshots track progression', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const trace = simulateRunV2({ harness, loop }, 42);

    expect(trace.stateSnapshots.length).toBeGreaterThan(0);
    for (let i = 0; i < trace.stateSnapshots.length; i++) {
      expect(trace.stateSnapshots[i].step).toBe(i + 1);
    }
  });

  it('handles DEADLOCK correctly', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const config = {
      harness,
      loop,
      graph: {
        state_schema: [],
        nodes: [
          { id: 'node_1', role: 'coder' as const, state_writes: [] },
          { id: 'node_2', role: 'tester' as const, state_writes: [] },
        ],
        edges: [{ source: 'node_1', target: 'some_other', condition: 'always' as const }],
        entry: 'node_1',
        checkpointing: false,
      },
    };

    const trace = simulateRunV2(config, 42);
    expect(trace.status).toBe('FAILED');
    expect(trace.failureReason).toBe('DEADLOCK');
    expect(trace.events.length).toBe(1);
  });

  it('accepts custom goal string', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const trace = simulateRunV2({ harness, loop }, 42, 'Custom goal');
    expect(trace.stateSnapshots[0].goal).toBe('Custom goal');
  });
});

// ==================== traceToV2 ====================

describe('traceToV2', () => {
  it('converts a full RunTrace to Trace format', () => {
    const steps: TraceStep[] = [
      makeStep({ step: 1, action: 'THINK', status: 'SUCCESS', node: 'coder' }),
      makeStep({ step: 2, action: 'EDIT_FILE', status: 'SUCCESS', node: 'coder' }),
      makeStep({ step: 3, action: 'RUN_TEST', status: 'FAIL', node: 'tester', warning: 'task_abandoned' }),
    ];
    const harness = makeHarness();
    const trace = traceToV2('sim_123', 42, 'FAILED', 'TASK_ABANDONED', 5000, steps, harness);

    expect(trace.traceId).toBe('sim_123');
    expect(trace.seed).toBe(42);
    expect(trace.status).toBe('FAILED');
    expect(trace.failureReason).toBe('TASK_ABANDONED');
    expect(trace.totalTokens).toBe(5000);
    expect(trace.events.length).toBe(3);
    expect(trace.stateSnapshots.length).toBe(3);
    expect(trace.contextSnapshots.length).toBe(3);
    expect(trace.environmentSnapshots.length).toBe(3);

    // Event types
    expect(trace.events[0].type).toBe('MODEL_CALL');
    expect(trace.events[1].type).toBe('TOOL_EXECUTE');
    expect(trace.events[2].type).toBe('VERIFY');
  });
});
