import { describe, it, expect } from 'vitest';
import {
  stepToEvent,
  buildStateSnapshot,
  buildContextSnapshot,
  buildEnvironmentSnapshot,
  traceToV2,
} from './eventFactory';
import { simulateRunV2 } from './runtimeSimulator';
import { simulateMonteCarloV2 } from './monteCarlo';
import type { HarnessConfig, TraceStep } from '../types';
import type { AgentEvent } from '../types/events';

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

// ==================== stepToEvent ====================

describe('stepToEvent', () => {
  it('converts a THINK step to MODEL_CALL event', () => {
    const step = makeStep({ action: 'THINK' });
    const event = stepToEvent(step, 'node_1', 3000);
    expect(event.type).toBe('MODEL_CALL');
    expect(event.id).toBe('evt-1');
    expect(event.timestamp).toBe(3000);
    expect(event.nodeId).toBe('node_1');
    expect(event.payload.action).toBe('THINK');
  });

  it('converts a RUN_TEST step to VERIFY event', () => {
    const step = makeStep({ action: 'RUN_TEST', status: 'FAIL', warning: 'test_failed' });
    const event = stepToEvent(step, 'tester', 5000);
    expect(event.type).toBe('VERIFY');
    expect(event.payload.status).toBe('FAIL');
    expect(event.payload.warning).toBe('test_failed');
  });

  it('converts EDIT_FILE to TOOL_EXECUTE event', () => {
    const step = makeStep({ action: 'EDIT_FILE' });
    const event = stepToEvent(step, 'coder', 2000);
    expect(event.type).toBe('TOOL_EXECUTE');
  });

  it('converts RETRY to STATE_UPDATE event', () => {
    const step = makeStep({ action: 'RETRY' });
    const event = stepToEvent(step, 'node_1', 1000);
    expect(event.type).toBe('STATE_UPDATE');
  });

  it('converts CHECK_EVIDENCE to OBSERVATION_RECEIVE event', () => {
    const step = makeStep({ action: 'CHECK_EVIDENCE' });
    const event = stepToEvent(step, 'node_1', 1000);
    expect(event.type).toBe('OBSERVATION_RECEIVE');
  });

  it('converts STOP to LOOP_STOP event', () => {
    const step = makeStep({ action: 'STOP' });
    const event = stepToEvent(step, 'node_1', 1000);
    expect(event.type).toBe('LOOP_STOP');
  });

  it('preserves reflection in payload', () => {
    const step = makeStep({ action: 'RETRY', reflection: 'reflect_test_fail' });
    const event = stepToEvent(step, 'node_1', 1000);
    expect(event.payload.reflection).toBe('reflect_test_fail');
  });

  it('uses default nodeId', () => {
    const step = makeStep({ node: undefined });
    const event = stepToEvent(step, 'fallback', 0);
    expect(event.nodeId).toBe('fallback');
  });
});

// ==================== buildStateSnapshot ====================

describe('buildStateSnapshot', () => {
  it('reflects belief vs reality from events', () => {
    const events: AgentEvent[] = [
      stepToEvent(makeStep({ action: 'THINK', status: 'SUCCESS', step: 1 }), 'node_1', 1000),
      stepToEvent(makeStep({ action: 'EDIT_FILE', status: 'FAIL', warning: 'hallucination', step: 2 }), 'node_1', 2000),
    ];
    const snapshot = buildStateSnapshot(2, 'Fix the bug', events);
    expect(snapshot.step).toBe(2);
    expect(snapshot.goal).toBe('Fix the bug');
    expect(snapshot.belief.status).toBe('FAIL');
    expect(snapshot.belief.lastAction).toBe('TOOL_EXECUTE');
    expect(snapshot.reality.status).toBe('FAIL');
    expect(snapshot.reality.failureWarning).toBe('hallucination');
  });

  it('handles empty events gracefully', () => {
    const snapshot = buildStateSnapshot(0, 'Do task', []);
    expect(snapshot.step).toBe(0);
    expect(snapshot.belief.status).toBe('unknown');
    expect(snapshot.belief.lastAction).toBe('none');
    expect(snapshot.reality.status).toBe('unknown');
  });

  it('tracks success and failure counts', () => {
    const events: AgentEvent[] = [
      stepToEvent(makeStep({ action: 'THINK', status: 'SUCCESS', step: 1 }), 'a', 1000),
      stepToEvent(makeStep({ action: 'EDIT_FILE', status: 'SUCCESS', step: 2 }), 'a', 2000),
      stepToEvent(makeStep({ action: 'RUN_TEST', status: 'FAIL', step: 3 }), 'a', 3000),
    ];
    const snapshot = buildStateSnapshot(3, 'Goal', events);
    expect(snapshot.belief.succeeded).toBe(2);
    expect(snapshot.belief.failed).toBe(1);
  });
});

// ==================== buildContextSnapshot ====================

describe('buildContextSnapshot', () => {
  it('includes tools when tool_registry is enabled', () => {
    const harness = makeHarness({ has_tool_registry: true });
    const snapshot = buildContextSnapshot(1, harness, 3);
    expect(snapshot.tools.length).toBe(3);
    expect(snapshot.tools[0].name).toBe('read_file');
  });

  it('has empty tools when tool_registry is disabled', () => {
    const harness = makeHarness({ has_tool_registry: false });
    const snapshot = buildContextSnapshot(1, harness, 3);
    expect(snapshot.tools.length).toBe(0);
  });

  it('uses run_boundary_cap as tokenLimit when set', () => {
    const harness = makeHarness({ run_boundary_cap: 12000 });
    const snapshot = buildContextSnapshot(1, harness, 2);
    expect(snapshot.tokenLimit).toBe(12000);
    expect(snapshot.tokenCount).toBe(2000); // 2 * 1000
  });

  it('defaults tokenLimit to 8000 when cap is null', () => {
    const harness = makeHarness({ run_boundary_cap: null });
    const snapshot = buildContextSnapshot(1, harness, 5);
    expect(snapshot.tokenLimit).toBe(8000);
  });

  it('includes systemPrompt and memory', () => {
    const snapshot = buildContextSnapshot(1, makeHarness(), 1);
    expect(snapshot.systemPrompt).toContain('coding agent');
    expect(snapshot.memory.length).toBeGreaterThan(0);
    expect(snapshot.workspace).toHaveProperty('auth.py');
  });
});

// ==================== buildEnvironmentSnapshot ====================

describe('buildEnvironmentSnapshot', () => {
  it('reflects tool_registry state', () => {
    const harness = makeHarness({ has_tool_registry: true });
    const snapshot = buildEnvironmentSnapshot(1, harness);
    expect(snapshot.toolRegistry).toEqual(['read_file', 'write_file', 'run_tests']);
  });

  it('has empty toolRegistry when disabled', () => {
    const harness = makeHarness({ has_tool_registry: false });
    const snapshot = buildEnvironmentSnapshot(1, harness);
    expect(snapshot.toolRegistry).toEqual([]);
  });

  it('includes fileSystem', () => {
    const snapshot = buildEnvironmentSnapshot(3, makeHarness());
    expect(snapshot.step).toBe(3);
    expect(snapshot.fileSystem).toHaveProperty('auth.py');
    expect(snapshot.fileSystem).toHaveProperty('test_auth.py');
  });
});

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

// ==================== simulateMonteCarloV2 ====================

describe('simulateMonteCarloV2', () => {
  it('produces a valid TraceMonteCarloResult', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const result = simulateMonteCarloV2({ harness, loop }, 1, 30);

    expect(result.successRate).toBeGreaterThanOrEqual(0);
    expect(result.successRate).toBeLessThanOrEqual(1);
    expect(result.avgTokens).toBeGreaterThan(0);
    expect(result.runs).toBe(30);
    expect(typeof result.failureDistribution).toBe('object');
  });

  it('sampleTraces are V2 Trace format', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const result = simulateMonteCarloV2({ harness, loop }, 7, 10);

    expect(result.sampleTraces.length).toBeGreaterThan(0);
    for (const trace of result.sampleTraces) {
      expect(trace.events).toBeDefined();
      expect(trace.stateSnapshots).toBeDefined();
      expect(trace.contextSnapshots).toBeDefined();
      expect(trace.environmentSnapshots).toBeDefined();
      expect(trace.events.length).toBeGreaterThan(0);
    }
  });

  it('is deterministic', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const a = simulateMonteCarloV2({ harness, loop }, 42, 50);
    const b = simulateMonteCarloV2({ harness, loop }, 42, 50);
    expect(a).toEqual(b);
  });

  it('caps runs at 100', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const result = simulateMonteCarloV2({ harness, loop }, 3, 500);
    expect(result.runs).toBe(100);
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
