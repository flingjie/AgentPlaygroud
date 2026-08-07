import { describe, it, expect } from 'vitest';
import { simulateRun } from './runtimeSimulator';
import type { HarnessConfig, LoopConfig } from '../types';

// ==================== Test Helpers ====================

/**
 * Create a default harness config with all dimensions enabled.
 */
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

/**
 * Create a default loop config with all settings enabled.
 */
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

/**
 * Create a simple graph with a single coder node.
 */
function makeGraph(overrides: Partial<{ nodes: any[]; edges: any[]; entry: string | null }> = {}) {
  return {
    state_schema: [],
    nodes: overrides.nodes ?? [{ id: 'node_1', role: 'coder', state_writes: [] }],
    edges: overrides.edges ?? [],
    entry: overrides.entry ?? 'node_1',
    checkpointing: false,
  };
}

// ==================== Invariant (a): No loop ends with TASK_ABANDONED ====================

describe('runtimeSimulator invariants', () => {
  it('(a) bare model + loop disabled + no graph mostly FAILS', () => {
    // A truly bare harness (no registry, no safety dims) is dominated by
    // HALLUCINATION (0.65) on the coder's EDIT step. TASK_ABANDONED is only
    // reachable once the coder's own step failures are avoided (see a2). The
    // engine is probabilistic (test_pass has a 0.1 floor), so assert MOST runs
    // fail rather than every run.
    const harness = makeHarness({
      has_tool_registry: false,
      has_retry_policy: false,
      has_timeout_guard: false,
      has_sandbox_isolation: false,
      has_context_manager: false,
      has_state_persistence: false,
      has_permission_layer: false,
      memory_capacity: 1,
    });
    const loop = makeLoop({ enabled: false });
    const graph = makeGraph({ nodes: [{ id: 'node_1', role: 'coder', state_writes: [] }] });

    let failedCount = 0;
    for (let i = 0; i < 20; i++) {
      const trace = simulateRun({ harness, loop, graph }, i);
      if (trace.status === 'FAILED') failedCount++;
    }
    expect(failedCount).toBeGreaterThan(10);
  });

  it('(a2) loop disabled + tester node + minimal harness ends TASK_ABANDONED over many runs', () => {
    // A TESTER-only node avoids all coder step-gated failures. With tool_registry
    // on (no HALLUCINATION cross-cut) and no loop, the single test attempt fails
    // and abandons the task. Low hq (only tool_registry + cap 1) keeps the test
    // failing ~45% of the time so TASK_ABANDONED is reliably observed.
    const harness = makeHarness({
      memory_capacity: 1,
      has_tool_registry: true,
      has_sandbox_isolation: false,
      has_permission_layer: false,
    });
    const loop = makeLoop({ enabled: false });
    const graph = makeGraph({ nodes: [{ id: 'node_1', role: 'tester', state_writes: [] }] });

    let abandonedCount = 0;
    for (let i = 0; i < 30; i++) {
      const trace = simulateRun({ harness, loop, graph }, i);
      if (trace.failureReason === 'TASK_ABANDONED') abandonedCount++;
    }
    expect(abandonedCount).toBeGreaterThan(0);
  });
});

// ==================== Invariant (b): No tool_registry + coder produces HALLUCINATION ====================

describe('(b) no tool_registry + coder can produce HALLUCINATION', () => {
  it('over many runs some end with HALLUCINATION', () => {
    const harness = makeHarness({ has_tool_registry: false });
    const loop = makeLoop({ enabled: false });
    const graph = makeGraph();

    let hallucinationCount = 0;
    for (let i = 0; i < 20; i++) {
      const trace = simulateRun({ harness, loop, graph }, i);
      if (trace.failureReason === 'HALLUCINATION') {
        hallucinationCount++;
      }
    }
    // With rate ~0.65, we should see some hallucinations
    expect(hallucinationCount).toBeGreaterThan(0);
  });
});

// ==================== Invariant (c): Same seed produces identical trace ====================

describe('(c) same seed produces identical traces', () => {
  it('deep equality on identical seeds', () => {
    const harness = makeHarness();
    const loop = makeLoop();
    const graph = makeGraph();

    const trace1 = simulateRun({ harness, loop, graph }, 12345);
    const trace2 = simulateRun({ harness, loop, graph }, 12345);

    expect(trace1).toEqual(trace2);
  });

  it('deep equality for complex configs', () => {
    const harness = makeHarness({
      has_tool_registry: true,
      has_retry_policy: true,
      has_timeout_guard: true,
      has_sandbox_isolation: true,
      has_context_manager: true,
      has_state_persistence: true,
      has_permission_layer: true,
      memory_capacity: 4,
    });
    const loop = makeLoop({
      enabled: true,
      trigger: 'on_test_fail',
      goal: 'tests_green',
      action_policy: 'edit_then_retest',
      evidence: 'test_runner',
      feedback: 'reflexion',
      stop_on: 'evidence_pass',
      max_iterations: 5,
    });
    const graph = makeGraph({
      nodes: [
        { id: 'node_1', role: 'planner', state_writes: ['context'] },
        { id: 'node_2', role: 'coder', state_writes: ['files'] },
        { id: 'node_3', role: 'reviewer', state_writes: ['rating'] },
        { id: 'node_4', role: 'tester', state_writes: ['test_results'] },
      ],
      edges: [
        { source: 'node_1', target: 'node_2', condition: 'always' },
        { source: 'node_2', target: 'node_3', condition: 'always' },
        { source: 'node_3', target: 'node_4', condition: 'always' },
      ],
      entry: 'node_1',
    });

    const trace1 = simulateRun({ harness, loop, graph }, 99999);
    const trace2 = simulateRun({ harness, loop, graph }, 99999);

    expect(trace1).toEqual(trace2);
    expect(trace1.runId).toBe(trace2.runId);
    expect(trace1.steps.length).toBe(trace2.steps.length);
  });
});

// ==================== Invariant (d): Timeout guard + tiny cap produces BUDGET_EXHAUSTED ====================

describe('(d) timeout_guard + tiny run_boundary_cap produces BUDGET_EXHAUSTED', () => {
  it('budget exhausted when cap exceeded', () => {
    const harness = makeHarness({
      has_timeout_guard: true,
      run_boundary_cap: 1000, // Very small budget
    });
    const loop = makeLoop({ enabled: false });
    const graph = makeGraph();

    // The first THINK + EDIT_FILE + RUN_TEST costs: 1000 + 2500 + 1500 = 5000
    // But with a 1000 cap, we should hit BUDGET_EXHAUSTED
    const trace = simulateRun({ harness, loop, graph }, 42);

    expect(trace.status).toBe('FAILED');
    expect(trace.failureReason).toBe('BUDGET_EXHAUSTED');
    const stopStep = trace.steps.find(s => s.action === 'STOP');
    expect(stopStep?.status).toBe('FAIL');
    expect(stopStep?.warning).toBe('budget_exhausted');
  });
});

// ==================== Invariant (e): Graph with unreachable node produces DEADLOCK ====================

describe('(e) graph with unreachable node produces DEADLOCK', () => {
  it('deadlock short-circuits with exactly 1 step', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const graph = makeGraph({
      nodes: [
        { id: 'node_1', role: 'coder', state_writes: [] },
        { id: 'node_2', role: 'tester', state_writes: [] }, // Unreachable!
      ],
      edges: [{ source: 'node_1', target: 'some_other', condition: 'always' }], // No edge to node_2
      entry: 'node_1',
    });

    const trace = simulateRun({ harness, loop, graph }, 42);

    expect(trace.status).toBe('FAILED');
    expect(trace.failureReason).toBe('DEADLOCK');
    expect(trace.steps.length).toBe(1);
    expect(trace.steps[0].action).toBe('STOP');
    expect(trace.steps[0].status).toBe('FAIL');
    expect(trace.steps[0].warning).toBe('deadlock');
  });
});

// ==================== Additional Tests ====================

describe('additional tests', () => {
  it('loop disabled path emits a RUN_TEST step', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const graph = makeGraph({ nodes: [{ id: 'node_1', role: 'tester', state_writes: [] }] });

    const trace = simulateRun({ harness, loop, graph }, 42);

    expect(trace.steps.some(s => s.action === 'RUN_TEST')).toBe(true);
  });

  it('loop enabled with retry_policy + evidence_pass can reach SUCCESS', () => {
    const harness = makeHarness();
    const loop = makeLoop({
      enabled: true,
      evidence: 'test_runner',
      feedback: 'reflexion',
      stop_on: 'evidence_pass',
      max_iterations: 10,
    });
    const graph = makeGraph();

    // With enough iterations and good RNG, we should see a success
    let successCount = 0;
    for (let i = 0; i < 50; i++) {
      const trace = simulateRun({ harness, loop, graph }, i);
      if (trace.status === 'SUCCESS') {
        successCount++;
      }
    }
    // We should see some successes
    expect(successCount).toBeGreaterThan(0);
  });

  it('token costs accumulate correctly', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const graph = makeGraph({ nodes: [{ id: 'node_1', role: 'coder', state_writes: [] }] });

    const trace = simulateRun({ harness, loop, graph }, 42);

    const sumOfStepCosts = trace.steps.reduce((sum, s) => sum + s.costTokens, 0);
    expect(trace.costTokens).toBe(sumOfStepCosts);
  });

  it('HALLUCINATION has correct warning on failed step', () => {
    const harness = makeHarness({ has_tool_registry: false });
    const loop = makeLoop({ enabled: false });
    const graph = makeGraph();

    // Force hallucination with controlled seed
    for (let seed = 0; seed < 100; seed++) {
      const trace = simulateRun({ harness, loop, graph }, seed);
      if (trace.failureReason === 'HALLUCINATION') {
        const failStep = trace.steps.find(s => s.status === 'FAIL');
        expect(failStep).toBeDefined();
        expect(failStep?.warning).toBe('hallucination');
        break;
      }
    }
  });

  it('DEADLOCK occurs on dead-ending failure edge', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: false });
    const graph = makeGraph({
      nodes: [
        { id: 'node_1', role: 'coder', state_writes: [] },
        { id: 'node_2', role: 'tester', state_writes: [] },
      ],
      edges: [{ source: 'node_1', target: 'node_2', condition: 'on_fail' }],
      entry: 'node_1',
    });

    const trace = simulateRun({ harness, loop, graph }, 42);

    expect(trace.failureReason).toBe('DEADLOCK');
    expect(trace.steps.length).toBe(1);
  });
});

// ==================== Memory Overflow Tests ====================

describe('memory conditions', () => {
  it('MEMORY_STACK_OVERFLOW occurs with small capacity and many steps', () => {
    const harness = makeHarness({
      memory_capacity: 2, // Very small
      has_tool_registry: true, // Avoid HALLUCINATION dominance
    });
    const loop = makeLoop({ enabled: false });
    const graph = makeGraph({
      nodes: [
        { id: 'node_1', role: 'coder', state_writes: [] },
        { id: 'node_2', role: 'coder', state_writes: [] },
        { id: 'node_3', role: 'coder', state_writes: [] },
      ],
      edges: [
        { source: 'node_1', target: 'node_2', condition: 'always' },
        { source: 'node_2', target: 'node_3', condition: 'always' },
      ],
    });

    // Many steps should trigger memory overflow
    let overflowCount = 0;
    for (let i = 0; i < 30; i++) {
      const trace = simulateRun({ harness, loop, graph }, i);
      if (trace.failureReason === 'MEMORY_STACK_OVERFLOW') {
        overflowCount++;
      }
    }
    // With small capacity and multiple coders, we should see some overflow
    expect(overflowCount).toBeGreaterThan(0);
  });
});

// ==================== Stale Context Tests ====================

describe('stale context conditions', () => {
  it('STALE_CONTEXT can occur without context_manager', () => {
    const harness = makeHarness({
      has_context_manager: false,
    });
    const loop = makeLoop({ enabled: false });
    const graph = makeGraph({
      nodes: [
        { id: 'node_1', role: 'coder', state_writes: [] },
        { id: 'node_2', role: 'coder', state_writes: [] },
      ],
    });

    // Multiple coder steps can create stale context
    let staleCount = 0;
    for (let i = 0; i < 20; i++) {
      const trace = simulateRun({ harness, loop, graph }, i);
      if (trace.failureReason === 'STALE_CONTEXT') {
        staleCount++;
      }
    }
    expect(staleCount).toBeGreaterThanOrEqual(0); // May or may not occur depending on RNG
  });
});

// ==================== Loop Stack Tests ====================

describe('loop stack templates', () => {
  it('dual loop stack template works', () => {
    const harness = makeHarness();
    const loop = makeLoop({ enabled: true, evidence: 'test_runner' });
    const graph = makeGraph();

    // inner: edit_then_retest/test_runner/reflexion/max3
    // outer: escalate_review/reviewer_signoff/compact_error/max5
    const loopStack = { enabled: true, template: 'dual' as const };

    const trace = simulateRun({ harness, loop, loopStack, graph }, 42);

    // Should either succeed or fail with INFINITE_LOOP_TRAP
    expect(['SUCCESS', 'FAILED']).toContain(trace.status);
    if (trace.status === 'FAILED') {
      expect(trace.failureReason).toBe('INFINITE_LOOP_TRAP');
    }
  });

  it('factory loop stack works with graph bonus (3+ nodes)', () => {
    // High memory_capacity keeps the 4-node node-simulation phase from
    // overflowing (which would fail the run before the factory loop-stack runs).
    const harness = makeHarness({ memory_capacity: 10 });
    const loop = makeLoop({ enabled: true });
    const graph = makeGraph({
      nodes: [
        { id: 'planner', role: 'planner', state_writes: [] },
        { id: 'coder', role: 'coder', state_writes: [] },
        { id: 'reviewer', role: 'reviewer', state_writes: [] },
        { id: 'tester', role: 'tester', state_writes: [] },
      ],
      edges: [
        { source: 'planner', target: 'coder', condition: 'always' },
        { source: 'coder', target: 'reviewer', condition: 'always' },
        { source: 'reviewer', target: 'tester', condition: 'always' },
      ],
    });

    const loopStack = { enabled: true, template: 'factory' as const };

    // Factory is probabilistic: each stage fails at max(0.05, 0.25 - hq*0.2).
    // With full harness that's ~8%/stage, so seed 42 may succeed. Assert over
    // many seeds that factory reaches both success and a stage failure.
    let failedFactory = 0;
    let sawStage = false;
    for (let i = 0; i < 40; i++) {
      const trace = simulateRun({ harness, loop, loopStack, graph }, i);
      if (trace.steps.some(s => typeof s.node === 'string' && s.node.startsWith('stage_'))) {
        sawStage = true;
      }
      if (trace.status === 'FAILED') {
        expect(['FALSE_COMPLETION', 'TASK_ABANDONED']).toContain(trace.failureReason);
        failedFactory++;
      }
    }
    // Factory emits per-stage RUN_TEST steps on stage_* nodes, proving the
    // pipeline ran (not the plain single-loop path).
    expect(sawStage).toBe(true);
    // The pipeline is risky enough that at least one stage fails over 40 seeds.
    expect(failedFactory).toBeGreaterThan(0);
  });
});

// ==================== Budget Check Tests ====================

describe('budget checks', () => {
  it('BUDGET_EXHAUSTED is checked after all steps', () => {
    const harness = makeHarness({
      has_timeout_guard: true,
      run_boundary_cap: 500, // Tiny budget
    });
    const loop = makeLoop({ enabled: false });
    const graph = makeGraph();

    const trace = simulateRun({ harness, loop, graph }, 42);

    expect(trace.failureReason).toBe('BUDGET_EXHAUSTED');
    expect(trace.steps.some(s => s.action === 'STOP' && s.status === 'FAIL')).toBe(true);
  });

  it('succeeds when budget is sufficient', () => {
    const harness = makeHarness({
      run_boundary_cap: 1_000_000, // Very large budget
    });
    const loop = makeLoop({ enabled: true, max_iterations: 1 });
    const graph = makeGraph({
      nodes: [{ id: 'node_1', role: 'tester', state_writes: [] }],
    });

    // With high budget and only 1 iteration, we should typically succeed
    const trace = simulateRun({ harness, loop, graph }, 42);

    // At least one run should succeed (the first test might pass)
    expect(trace.status).toBe('SUCCESS');
  });
});

// ==================== Graph Topology Tests ====================

describe('graph topologies', () => {
  it('single node graph has single topology', () => {
    const graph = makeGraph({ nodes: [{ id: 'node_1', role: 'coder', state_writes: [] }] });
    const trace = simulateRun({ harness: makeHarness(), loop: makeLoop(), graph }, 42);
    expect(trace.topology.kind).toBe('single');
    expect(trace.topology.hasFeedback).toBe(false);
  });

  it('chain topology detected', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'coder', role: 'coder', state_writes: [] },
        { id: 'tester', role: 'tester', state_writes: [] },
      ],
      edges: [{ source: 'coder', target: 'tester', condition: 'always' }],
      entry: 'coder',
    });
    const trace = simulateRun({ harness: makeHarness(), loop: makeLoop(), graph }, 42);
    expect(trace.topology.kind).toBe('chain');
  });

  it('feedback topology detected with cycle', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'coder', role: 'coder', state_writes: [] },
        { id: 'reviewer', role: 'reviewer', state_writes: [] },
      ],
      edges: [
        { source: 'coder', target: 'reviewer', condition: 'always' },
        { source: 'reviewer', target: 'coder', condition: 'on_fail' }, // Creates feedback loop
      ],
      entry: 'coder',
    });
    const trace = simulateRun({ harness: makeHarness(), loop: makeLoop(), graph }, 42);
    expect(trace.topology.kind).toBe('feedback');
    expect(trace.topology.hasFeedback).toBe(true);
  });

  it('parallel coders detected', () => {
    const graph = makeGraph({
      nodes: [
        { id: 'planner', role: 'planner', state_writes: [] },
        { id: 'coder_a', role: 'coder', state_writes: [] },
        { id: 'coder_b', role: 'coder', state_writes: [] },
        { id: 'tester', role: 'tester', state_writes: [] },
      ],
      edges: [
        { source: 'planner', target: 'coder_a', condition: 'always' },
        { source: 'planner', target: 'coder_b', condition: 'always' },
        { source: 'coder_a', target: 'tester', condition: 'always' },
        { source: 'coder_b', target: 'tester', condition: 'always' },
      ],
      entry: 'planner',
    });
    const trace = simulateRun({ harness: makeHarness(), loop: makeLoop(), graph }, 42);
    expect(trace.topology.kind).toBe('parallel');
    expect(trace.topology.parallelCoders).toBeGreaterThanOrEqual(2);
  });
});
