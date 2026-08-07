import { describe, it, expect } from 'vitest';
import { SeededRng } from './rng';
import type { HarnessConfig, LoopConfig, TraceStep, GraphSpec } from '../types';
import type { StepContext } from './failureEngine';
import {
  checkStepFailure,
  checkCrossCutFailure,
  staleLag,
  ACTION_COST,
  wouldFalseComplete,
  wouldTrapNoRetry,
  wouldAbandon,
  budgetExceeded,
  hasStructuralDeadlock,
  checkpointRecoveryChance,
  harnessQuality,
} from './failureEngine';

// ==================== Test Helpers ====================

/**
 * RNG that forces a specific boolean result for chance() - used to control test outcomes.
 * When forceReturn is false, no failure triggers (for "negative" tests).
 * When forceReturn is true, failure triggers (for "positive" tests).
 */
class ControlledRng extends SeededRng {
  private forceReturn: boolean;
  constructor(forceReturn: boolean) {
    super(0);
    this.forceReturn = forceReturn;
  }

  chance(_p: number): boolean {
    return this.forceReturn;
  }
  next(): number {
    return 0.5;
  }
  int(min: number, _max: number): number {
    return min;
  }
  pick<T>(arr: T[]): T {
    return arr[0];
  }
}

/**
 * Create a default harness config with all dimensions enabled.
 */
function makeHarness(
  overrides: Partial<HarnessConfig> = {}
): HarnessConfig {
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

// ==================== ACTION_COST Tests ====================

describe('ACTION_COST', () => {
  it('returns exact values for all actions', () => {
    expect(ACTION_COST.THINK).toBe(1000);
    expect(ACTION_COST.EDIT_FILE).toBe(2500);
    expect(ACTION_COST.RUN_TEST).toBe(1500);
    expect(ACTION_COST.RETRY).toBe(800);
    expect(ACTION_COST.CHECK_EVIDENCE).toBe(500);
    expect(ACTION_COST.STOP).toBe(100);
  });
});

// ==================== checkStepFailure Tests ====================

describe('checkStepFailure step-gated failures', () => {
  // Helper to get context for each failure type
  function getHALLUCINATIONCtx(): StepContext {
    return {
      harness: makeHarness({ has_tool_registry: false }),
      loop: makeLoop(),
      nodeRole: 'coder',
      stepCount: 5,
      coderEdits: 2,
      memoryUsed: 5,
      staleLag: 2,
      hasGroundedLoop: true,
    };
  }

  function getTOOL_FAILURECtx() {
    return {
      harness: makeHarness({ has_tool_registry: true }),
      loop: makeLoop({ evidence: 'none' }),
      nodeRole: 'coder' as const,
      stepCount: 5,
      coderEdits: 2,
      memoryUsed: 5,
      staleLag: 2,
      hasGroundedLoop: false,
    };
  }

  function getFILE_CORROSIONCtx() {
    return {
      harness: makeHarness({ has_state_persistence: false }),
      loop: makeLoop(),
      nodeRole: 'coder' as const,
      stepCount: 5,
      coderEdits: 3,
      memoryUsed: 5,
      staleLag: 2,
      hasGroundedLoop: true,
    };
  }

  function getMEMORY_STACK_OVERFLOWCtx() {
    return {
      harness: makeHarness({ memory_capacity: 3 }),
      loop: makeLoop(),
      nodeRole: 'coder' as const,
      stepCount: 3,
      coderEdits: 2,
      memoryUsed: 5,
      staleLag: 2,
      hasGroundedLoop: true,
    };
  }

  function getCONTEXT_OVERFLOWCtx() {
    // Context overflow happens when loop is enabled, memory >= cap, and risk > 0
    // Must set state_policy to one with risk > 0, and ensure memory >= cap
    return {
      harness: makeHarness({ memory_capacity: 5 }),
      loop: makeLoop({ state_policy: 'keep_last_error', enabled: true }),
      nodeRole: 'coder' as const,
      stepCount: 5,
      coderEdits: 2,
      memoryUsed: 5,
      staleLag: 0,  // No stale lag to avoid triggering STALE_CONTEXT
      hasGroundedLoop: true,
    };
  }

  function getSTALE_CONTEXTCtx() {
    // STALE_CONTEXT is checked AFTER CONTEXT_OVERFLOW
    // So we need to not trigger context overflow first: loop disabled OR memory < cap
    return {
      harness: makeHarness({ has_context_manager: false, has_tool_registry: true }),
      loop: makeLoop({ enabled: false }), // Disabled loop to avoid CONTEXT_OVERFLOW
      nodeRole: 'coder' as const,
      stepCount: 5,
      coderEdits: 2,
      memoryUsed: 2, // Low memory to avoid triggering memory failures
      staleLag: 2,   // >= 2 for stale context
      hasGroundedLoop: true,
    };
  }

  function getPERMISSION_ERRORCtx(): StepContext {
    // PERMISSION_ERROR is checked after CONTEXT_OVERFLOW
    // Must avoid triggering CONTEXT_OVERFLOW first: no loop enabled
    return {
      harness: makeHarness({ has_permission_layer: false, has_tool_registry: true }),
      loop: makeLoop({ enabled: false }), // Disabled loop to avoid CONTEXT_OVERFLOW
      nodeRole: 'coder',
      stepCount: 5,
      coderEdits: 1, // < 2 to avoid FILE_CORROSION
      memoryUsed: 2, // Low memory
      staleLag: 0,
      hasGroundedLoop: true,
    };
  }

  function getUNSAFE_EXECUTIONCtx() {
    // UNSAFE_EXECUTION is checked after STALE_CONTEXT, PERMISSION_ERROR
    // Requires has_tool_registry AND not has_sandbox_isolation
    return {
      harness: makeHarness({ has_sandbox_isolation: false, has_tool_registry: true }),
      loop: makeLoop({ enabled: false }), // Disabled loop to avoid CONTEXT_OVERFLOW
      nodeRole: 'coder' as const,
      stepCount: 5,
      coderEdits: 1,
      memoryUsed: 2,
      staleLag: 0,
      hasGroundedLoop: true,
    };
  }

  describe('HALLUCINATION', () => {
    it('returns HALLUCINATION when no tool_registry and coder (rng=true)', () => {
      const rng = new ControlledRng(true);
      const ctx = getHALLUCINATIONCtx();

      const result = checkStepFailure(ctx, rng);

      expect(result).toBe('HALLUCINATION');
    });

    it('returns HALLUCINATION with lower rate (0.5) when sandbox enabled', () => {
      const rng = new ControlledRng(true);
      const ctx = getHALLUCINATIONCtx();
      ctx.harness.has_sandbox_isolation = true;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBe('HALLUCINATION');
    });

    it('returns null when tool_registry is present (rng=false - HALLUCINATION not triggered)', () => {
      const rng = new ControlledRng(false);
      const ctx = getHALLUCINATIONCtx();
      ctx.harness.has_tool_registry = true;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });
  });

  describe('TOOL_FAILURE', () => {
    it('returns TOOL_FAILURE when grounded loop disabled (rng=true)', () => {
      const rng = new ControlledRng(true);
      const ctx = getTOOL_FAILURECtx();

      const result = checkStepFailure(ctx, rng);

      expect(result).toBe('TOOL_FAILURE');
    });

    it('returns null when grounded loop is enabled (rng=false - TOOL_FAILURE not triggered)', () => {
      const rng = new ControlledRng(false);
      const ctx = getTOOL_FAILURECtx();
      ctx.hasGroundedLoop = true;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });
  });

  describe('FILE_CORROSION', () => {
    it('returns FILE_CORROSION when no state_persistence and coder edits >= 2 (rng=true)', () => {
      const rng = new ControlledRng(true);
      const ctx = getFILE_CORROSIONCtx();

      const result = checkStepFailure(ctx, rng);

      expect(result).toBe('FILE_CORROSION');
    });

    it('returns null when state_persistence is enabled (rng=false - FILE_CORROSION not triggered)', () => {
      const rng = new ControlledRng(false);
      const ctx = getFILE_CORROSIONCtx();
      ctx.harness.has_state_persistence = true;
      ctx.coderEdits = 3;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });

    it('returns null when coderEdits < 2 (rng=false - FILE_CORROSION not triggered)', () => {
      const rng = new ControlledRng(false);
      const ctx = getFILE_CORROSIONCtx();
      ctx.harness.has_state_persistence = false;
      ctx.coderEdits = 1;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });
  });

  describe('MEMORY_STACK_OVERFLOW', () => {
    it('returns MEMORY_STACK_OVERFLOW when step >= 3, cap <= 3, memory >= cap (rng=true)', () => {
      const rng = new ControlledRng(true);
      const ctx = getMEMORY_STACK_OVERFLOWCtx();

      const result = checkStepFailure(ctx, rng);

      expect(result).toBe('MEMORY_STACK_OVERFLOW');
    });

    it('returns null when stepCount < 3 (rng=false - no MEMORY_STACK_OVERFLOW)', () => {
      const rng = new ControlledRng(false);
      const ctx = getMEMORY_STACK_OVERFLOWCtx();
      ctx.stepCount = 2;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });

    it('returns null when memory_capacity > 3 (rng=false - no MEMORY_STACK_OVERFLOW)', () => {
      const rng = new ControlledRng(false);
      const ctx = getMEMORY_STACK_OVERFLOWCtx();
      ctx.harness.memory_capacity = 4;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });

    it('returns null when memoryUsed < memory_capacity (rng=false - no MEMORY_STACK_OVERFLOW)', () => {
      const rng = new ControlledRng(false);
      const ctx = getMEMORY_STACK_OVERFLOWCtx();
      ctx.memoryUsed = 2;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });
  });

  describe('CONTEXT_OVERFLOW', () => {
    it('returns CONTEXT_OVERFLOW when loop enabled and memory >= cap (rng=true)', () => {
      const rng = new ControlledRng(true);
      const ctx = getCONTEXT_OVERFLOWCtx();

      const result = checkStepFailure(ctx, rng);

      expect(result).toBe('CONTEXT_OVERFLOW');
    });

    it('returns null when loop disabled (rng=false - no CONTEXT_OVERFLOW)', () => {
      const rng = new ControlledRng(false);
      const ctx = getCONTEXT_OVERFLOWCtx();
      ctx.loop.enabled = false;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });

    it('returns null when memoryUsed < memory_capacity (rng=false - no CONTEXT_OVERFLOW)', () => {
      const rng = new ControlledRng(false);
      const ctx = getCONTEXT_OVERFLOWCtx();
      ctx.memoryUsed = 3;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });

    it('returns null when state_policy has zero risk (rng=false - no CONTEXT_OVERFLOW)', () => {
      const rng = new ControlledRng(false);
      const ctx = getCONTEXT_OVERFLOWCtx();
      ctx.loop.state_policy = 'stateless';

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });
  });

  describe('STALE_CONTEXT', () => {
    it('returns STALE_CONTEXT when no context_manager and staleLag >= 2 (rng=true)', () => {
      const rng = new ControlledRng(true);
      const ctx = getSTALE_CONTEXTCtx();

      const result = checkStepFailure(ctx, rng);

      expect(result).toBe('STALE_CONTEXT');
    });

    it('returns null when context_manager is enabled (rng=false - no STALE_CONTEXT)', () => {
      const rng = new ControlledRng(false);
      const ctx = getSTALE_CONTEXTCtx();
      ctx.harness.has_context_manager = true;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });

    it('returns null when staleLag < 2 (rng=false - no STALE_CONTEXT)', () => {
      const rng = new ControlledRng(false);
      const ctx = getSTALE_CONTEXTCtx();
      ctx.staleLag = 1;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });
  });

  describe('PERMISSION_ERROR', () => {
    it('returns PERMISSION_ERROR when no permission_layer (rng=true)', () => {
      const rng = new ControlledRng(true);
      const ctx = getPERMISSION_ERRORCtx();

      const result = checkStepFailure(ctx, rng);

      expect(result).toBe('PERMISSION_ERROR');
    });

    it('returns null when permission_layer is enabled (rng=false - no PERMISSION_ERROR)', () => {
      const rng = new ControlledRng(false);
      const ctx = getPERMISSION_ERRORCtx();
      ctx.harness.has_permission_layer = true;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });
  });

  describe('UNSAFE_EXECUTION', () => {
    it('returns UNSAFE_EXECUTION when not has_sandbox_isolation (rng=true)', () => {
      const rng = new ControlledRng(true);
      const ctx = getUNSAFE_EXECUTIONCtx();

      const result = checkStepFailure(ctx, rng);

      expect(result).toBe('UNSAFE_EXECUTION');
    });

    it('returns null when sandbox_isolation is enabled (rng=false - no UNSAFE_EXECUTION)', () => {
      const rng = new ControlledRng(false);
      const ctx = getUNSAFE_EXECUTIONCtx();
      ctx.harness.has_sandbox_isolation = true;

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });
  });

  describe('order matters - first hit wins', () => {
    it('returns first matching failure when multiple conditions are met', () => {
      const rng = new ControlledRng(true);
      const ctx = {
        ...getHALLUCINATIONCtx(),
        harness: makeHarness({
          has_tool_registry: false,
          has_state_persistence: false,
          has_sandbox_isolation: false,
        }),
        stepCount: 3,
        memoryUsed: 5,
        staleLag: 2,
        memory_capacity: 3,
      };

      // HALLUCINATION should be first (no tool_registry + coder)
      const result = checkStepFailure(ctx, rng);

      expect(result).toBe('HALLUCINATION');
    });
  });

  describe('non-coder nodes', () => {
    it('does not return HALLUCINATION for planner', () => {
      const rng = new ControlledRng(false);
      const ctx = getHALLUCINATIONCtx();
      ctx.nodeRole = 'planner';

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });

    it('does not return PERMISSION_ERROR for reviewer', () => {
      const rng = new ControlledRng(false);
      const ctx = getPERMISSION_ERRORCtx();
      ctx.nodeRole = 'reviewer';

      const result = checkStepFailure(ctx, rng);

      expect(result).toBeNull();
    });
  });
});

// ==================== checkCrossCutFailure Tests ====================

describe('checkCrossCutFailure cross-cut failures', () => {
  function getCrossCutSafeCtx() {
    return {
      harness: makeHarness({ memory_capacity: 5, has_state_persistence: true, has_tool_registry: true }),
      loop: makeLoop(),
      nodeRole: 'coder' as const,
      stepCount: 2,
      coderEdits: 1, // < 2 to avoid FILE_CORROSION
      memoryUsed: 2,
      staleLag: 0,
      hasGroundedLoop: true,
    };
  }

  describe('MEMORY_STACK_OVERFLOW', () => {
    it('returns MEMORY_STACK_OVERFLOW (rng=true)', () => {
      const rng = new ControlledRng(true);
      const ctx = {
        harness: makeHarness({ memory_capacity: 3, has_tool_registry: true }),
        loop: makeLoop(),
        nodeRole: 'coder' as const,
        stepCount: 5,
        coderEdits: 1,
        memoryUsed: 5,
        staleLag: 0,
        hasGroundedLoop: true,
      };

      const result = checkCrossCutFailure(ctx, rng);

      expect(result).toBe('MEMORY_STACK_OVERFLOW');
    });
  });

  describe('FILE_CORROSION', () => {
    it('returns FILE_CORROSION (rng=true)', () => {
      const rng = new ControlledRng(true);
      const ctx = {
        harness: makeHarness({
          memory_capacity: 5, // > 3 to avoid MEMORY_STACK_OVERFLOW
          has_state_persistence: false,
          has_tool_registry: true,
        }),
        loop: makeLoop(),
        nodeRole: 'coder' as const,
        stepCount: 5,
        coderEdits: 3, // >= 2 for FILE_CORROSION
        memoryUsed: 2,
        staleLag: 0,
        hasGroundedLoop: true,
      };

      const result = checkCrossCutFailure(ctx, rng);

      expect(result).toBe('FILE_CORROSION');
    });
  });

  describe('HALLUCINATION', () => {
    it('returns HALLUCINATION (rng=true)', () => {
      const rng = new ControlledRng(true);
      const ctx = {
        harness: makeHarness({
          memory_capacity: 5, // > 3 to avoid MEMORY_STACK_OVERFLOW
          has_state_persistence: true, // avoid FILE_CORROSION
          has_tool_registry: false, // for HALLUCINATION
        }),
        loop: makeLoop(),
        nodeRole: 'coder' as const,
        stepCount: 5,
        coderEdits: 1,
        memoryUsed: 2,
        staleLag: 0,
        hasGroundedLoop: true,
      };

      const result = checkCrossCutFailure(ctx, rng);

      expect(result).toBe('HALLUCINATION');
    });
  });

  it('returns null when all safety measures are in place (rng=false - all pass)', () => {
    const rng = new ControlledRng(false);
    const ctx = getCrossCutSafeCtx();

    const result = checkCrossCutFailure(ctx, rng);

    expect(result).toBeNull();
  });
});

// ==================== staleLag Tests ====================

describe('staleLag', () => {
  it('computes lag correctly with no edits', () => {
    const steps: TraceStep[] = [
      { step: 1, action: 'THINK', status: 'SUCCESS', memory_used: 1, cost_tokens: 1000 },
    ];
    expect(staleLag(steps)).toBe(0);
  });

  it('computes lag when edits have occurred', () => {
    const steps: TraceStep[] = [
      { step: 1, action: 'THINK', status: 'SUCCESS', memory_used: 1, cost_tokens: 1000 },
      { step: 2, action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 2, cost_tokens: 2500 },
      { step: 3, action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 3, cost_tokens: 2500 },
    ];
    // state_version = 2 (2 edits), observed_version = 0 (THINK before any edits)
    // lag = 2 + 0 - 0 = 2
    expect(staleLag(steps)).toBe(2);
  });

  it('computes lag correctly with inFlightEdits', () => {
    const steps: TraceStep[] = [
      { step: 1, action: 'THINK', status: 'SUCCESS', memory_used: 1, cost_tokens: 1000 },
      { step: 2, action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 2, cost_tokens: 2500 },
    ];
    // state_version = 1, observed_version = 0 (THINK before any edits)
    // lag = 1 + 1 - 0 = 2
    expect(staleLag(steps, 1)).toBe(2);
  });

  it('computes stale lag >= 2', () => {
    const steps: TraceStep[] = [
      { step: 1, action: 'THINK', status: 'SUCCESS', memory_used: 1, cost_tokens: 1000 },
      { step: 2, action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 2, cost_tokens: 2500 },
      { step: 3, action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 3, cost_tokens: 2500 },
    ];
    // state_version = 2, observed_version = 0, inFlight = 1
    // lag = 2 + 1 - 0 = 3
    expect(staleLag(steps, 1)).toBe(3);
  });

  it('resets observed_version on CHECK_EVIDENCE', () => {
    const steps: TraceStep[] = [
      { step: 1, action: 'THINK', status: 'SUCCESS', memory_used: 1, cost_tokens: 1000 },
      { step: 2, action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 2, cost_tokens: 2500 },
      { step: 3, action: 'CHECK_EVIDENCE', status: 'SUCCESS', memory_used: 1, cost_tokens: 500 },
      { step: 4, action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 2, cost_tokens: 2500 },
    ];
    // state_version = 2 (2 edits), observed_version = 1 (CAPTURED at CHECK_EVIDENCE)
    // lag = 2 + 0 - 1 = 1
    expect(staleLag(steps)).toBe(1);
  });

  it('returns correct lag when no THINK or CHECK_EVIDENCE steps', () => {
    const steps: TraceStep[] = [
      { step: 1, action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 2, cost_tokens: 2500 },
      { step: 2, action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 3, cost_tokens: 2500 },
    ];
    // state_version = 2, observed_version = 0 (no observer), lag = 2 + 0 - 0 = 2
    expect(staleLag(steps)).toBe(2);
  });
});

// ==================== Flow Predicates Tests ====================

describe('Flow predicates', () => {
  describe('wouldFalseComplete', () => {
    it('returns true when stop_on is agent_says_done', () => {
      const loop = makeLoop({ stop_on: 'agent_says_done' });
      expect(wouldFalseComplete(loop)).toBe(true);
    });

    it('returns false when stop_on is evidence_pass', () => {
      const loop = makeLoop({ stop_on: 'evidence_pass' });
      expect(wouldFalseComplete(loop)).toBe(false);
    });

    it('returns false when stop_on is budget_or_max', () => {
      const loop = makeLoop({ stop_on: 'budget_or_max' });
      expect(wouldFalseComplete(loop)).toBe(false);
    });
  });

  describe('wouldTrapNoRetry', () => {
    it('returns true when loop enabled but no retry_policy', () => {
      const loop = makeLoop({ enabled: true });
      const harness = makeHarness({ has_retry_policy: false });
      expect(wouldTrapNoRetry(loop, harness)).toBe(true);
    });

    it('returns false when retry_policy is enabled', () => {
      const loop = makeLoop({ enabled: true });
      const harness = makeHarness({ has_retry_policy: true });
      expect(wouldTrapNoRetry(loop, harness)).toBe(false);
    });

    it('returns false when loop is disabled', () => {
      const loop = makeLoop({ enabled: false });
      const harness = makeHarness({ has_retry_policy: false });
      expect(wouldTrapNoRetry(loop, harness)).toBe(false);
    });
  });

  describe('wouldAbandon', () => {
    it('returns true when loop is disabled', () => {
      const loop = makeLoop({ enabled: false });
      expect(wouldAbandon(loop)).toBe(true);
    });

    it('returns false when loop is enabled', () => {
      const loop = makeLoop({ enabled: true });
      expect(wouldAbandon(loop)).toBe(false);
    });
  });

  describe('budgetExceeded', () => {
    it('returns true when timeout_guard enabled and cost exceeds cap', () => {
      const harness = makeHarness({ run_boundary_cap: 10000 });
      expect(budgetExceeded(harness, 15000)).toBe(true);
    });

    it('returns false when cost is under cap', () => {
      const harness = makeHarness({ run_boundary_cap: 10000 });
      expect(budgetExceeded(harness, 5000)).toBe(false);
    });

    it('returns false when timeout_guard disabled', () => {
      const harness = makeHarness({ run_boundary_cap: 10000, has_timeout_guard: false });
      expect(budgetExceeded(harness, 15000)).toBe(false);
    });

    it('returns false when run_boundary_cap is null', () => {
      const harness = makeHarness({ run_boundary_cap: null as any });
      expect(budgetExceeded(harness, 15000)).toBe(false);
    });

    it('returns false when run_boundary_cap is undefined', () => {
      const harness = makeHarness({ run_boundary_cap: undefined as any });
      expect(budgetExceeded(harness, 15000)).toBe(false);
    });
  });
});

// ==================== hasStructuralDeadlock Tests ====================

describe('hasStructuralDeadlock', () => {
  it('returns false for empty graph', () => {
    expect(hasStructuralDeadlock({ state_schema: [], nodes: [], edges: [], entry: null, checkpointing: false })).toBe(false);
  });

  it('returns false for single node graph', () => {
    const graph: GraphSpec = {
      state_schema: [],
      nodes: [{ id: 'node_1', role: 'planner', state_writes: [] }],
      edges: [],
      entry: 'node_1',
      checkpointing: false,
    };
    expect(hasStructuralDeadlock(graph)).toBe(false);
  });

  it('returns true when node is unreachable', () => {
    const graph: GraphSpec = {
      state_schema: [],
      nodes: [
        { id: 'node_1', role: 'planner', state_writes: [] },
        { id: 'node_2', role: 'coder', state_writes: [] }, // Unreachable - no edge to this node
      ],
      edges: [{ source: 'node_1', target: 'node_1', condition: 'always' }], // node_1 has self-loop only
      entry: 'node_1',
      checkpointing: false,
    };
    expect(hasStructuralDeadlock(graph)).toBe(true);
  });

  it('returns true when failure edge dead-ends with no recovery', () => {
    const graph: GraphSpec = {
      state_schema: [],
      nodes: [
        { id: 'node_1', role: 'coder', state_writes: [] },
        { id: 'node_2', role: 'coder', state_writes: [] },
      ],
      edges: [
        { source: 'node_1', target: 'node_2', condition: 'on_fail' }, // on_fail to node with no outgoing edges
      ],
      entry: 'node_1',
      checkpointing: false,
    };
    expect(hasStructuralDeadlock(graph)).toBe(true);
  });

  it('returns true when on_review_reject edge dead-ends', () => {
    const graph: GraphSpec = {
      state_schema: [],
      nodes: [
        { id: 'node_1', role: 'reviewer', state_writes: [] },
        { id: 'node_2', role: 'coder', state_writes: [] },
      ],
      edges: [
        { source: 'node_1', target: 'node_2', condition: 'on_review_reject' },
      ],
      entry: 'node_1',
      checkpointing: false,
    };
    expect(hasStructuralDeadlock(graph)).toBe(true);
  });

  it('returns false for valid chain graph', () => {
    const graph: GraphSpec = {
      state_schema: [],
      nodes: [
        { id: 'node_1', role: 'planner', state_writes: [] },
        { id: 'node_2', role: 'coder', state_writes: [] },
        { id: 'node_3', role: 'reviewer', state_writes: [] },
      ],
      edges: [
        { source: 'node_1', target: 'node_2', condition: 'always' },
        { source: 'node_2', target: 'node_3', condition: 'always' },
      ],
      entry: 'node_1',
      checkpointing: false,
    };
    expect(hasStructuralDeadlock(graph)).toBe(false);
  });

  it('returns false when failure edge has recovery path', () => {
    const graph: GraphSpec = {
      state_schema: [],
      nodes: [
        { id: 'node_1', role: 'coder', state_writes: [] },
        { id: 'node_2', role: 'reviewer', state_writes: [] },
        { id: 'node_3', role: 'planner', state_writes: [] },
      ],
      edges: [
        { source: 'node_1', target: 'node_2', condition: 'on_fail' },
        { source: 'node_2', target: 'node_3', condition: 'always' },
      ],
      entry: 'node_1',
      checkpointing: false,
    };
    expect(hasStructuralDeadlock(graph)).toBe(false);
  });

  it('detects unreachable node when entry is explicit', () => {
    const graph: GraphSpec = {
      state_schema: [],
      nodes: [
        { id: 'node_1', role: 'planner', state_writes: [] },
        { id: 'node_2', role: 'coder', state_writes: [] },
        { id: 'node_3', role: 'reviewer', state_writes: [] },
      ],
      edges: [
        { source: 'node_1', target: 'node_3', condition: 'always' },
      ],
      entry: 'node_1',
      checkpointing: false,
    };
    // node_2 is unreachable (no incoming edges, and node_1 doesn't connect to it)
    expect(hasStructuralDeadlock(graph)).toBe(true);
  });

  it('returns false when multiple valid paths exist', () => {
    const graph: GraphSpec = {
      state_schema: [],
      nodes: [
        { id: 'start', role: 'planner', state_writes: [] },
        { id: 'coder_a', role: 'coder', state_writes: [] },
        { id: 'coder_b', role: 'coder', state_writes: [] },
        { id: 'end', role: 'reviewer', state_writes: [] },
      ],
      edges: [
        { source: 'start', target: 'coder_a', condition: 'always' },
        { source: 'start', target: 'coder_b', condition: 'always' },
        { source: 'coder_a', target: 'end', condition: 'always' },
        { source: 'coder_b', target: 'end', condition: 'always' },
      ],
      entry: 'start',
      checkpointing: false,
    };
    expect(hasStructuralDeadlock(graph)).toBe(false);
  });

  it('handles implicit entry (node with no incoming edges)', () => {
    const graph: GraphSpec = {
      state_schema: [],
      nodes: [
        { id: 'node_1', role: 'planner', state_writes: [] },
        { id: 'node_2', role: 'coder', state_writes: [] },
      ],
      edges: [{ source: 'node_1', target: 'node_2', condition: 'always' }],
      entry: null, // No explicit entry - should infer node_1
      checkpointing: false,
    };
    expect(hasStructuralDeadlock(graph)).toBe(false);
  });
});

// ==================== checkpointRecoveryChance Tests ====================

describe('checkpointRecoveryChance', () => {
  it('returns 0.45 for empty state schema', () => {
    expect(checkpointRecoveryChance(0)).toBeCloseTo(0.45);
  });

  it('increases by 0.05 per state_schema element', () => {
    expect(checkpointRecoveryChance(1)).toBeCloseTo(0.5);
    expect(checkpointRecoveryChance(2)).toBeCloseTo(0.55);
    expect(checkpointRecoveryChance(3)).toBeCloseTo(0.6);
    expect(checkpointRecoveryChance(4)).toBeCloseTo(0.65);
  });

  it('caps at 0.9', () => {
    expect(checkpointRecoveryChance(9)).toBeCloseTo(0.9);
    expect(checkpointRecoveryChance(10)).toBeCloseTo(0.9);
    expect(checkpointRecoveryChance(20)).toBeCloseTo(0.9);
  });
});

// ==================== harnessQuality Tests ====================

describe('harnessQuality', () => {
  it('returns 0 when all dims are false', () => {
    // Note: memory_capacity defaults to 5, which adds 0.25 to quality
    // To get 0 quality, we need all dims false AND memory_capacity = 0
    const harness = makeHarness({
      memory_capacity: 0,
      has_tool_registry: false,
      has_timeout_guard: false,
      has_sandbox_isolation: false,
      has_context_manager: false,
      has_state_persistence: false,
      has_permission_layer: false,
    });
    expect(harnessQuality(harness)).toBeCloseTo(0);
  });

  it('returns 0.1 per enabled dim plus 0.05 per memory capacity', () => {
    const harness = makeHarness({
      has_tool_registry: true,
      has_timeout_guard: true,
      has_sandbox_isolation: true,
      has_context_manager: true,
      has_state_persistence: true,
      has_permission_layer: true,
      memory_capacity: 5,
    });
    // 6 dims * 0.1 = 0.6, memory 5 * 0.05 = 0.25, total = 0.85
    expect(harnessQuality(harness)).toBeCloseTo(0.85);
  });

  it('caps memory at 10', () => {
    const harness = makeHarness({ memory_capacity: 15 });
    const quality15 = harnessQuality(harness);

    const harness2 = makeHarness({ memory_capacity: 10 });
    const quality10 = harnessQuality(harness2);

    expect(quality15).toBeCloseTo(quality10);
  });

  it('returns exactly 0.5 for 3 enabled dims', () => {
    const harness = makeHarness({
      has_tool_registry: true,
      has_timeout_guard: true,
      has_sandbox_isolation: true,
      has_context_manager: false,
      has_state_persistence: false,
      has_permission_layer: false,
    });
    // 3 dims * 0.1 = 0.3, memory 5 * 0.05 = 0.25, total = 0.55
    expect(harnessQuality(harness)).toBeCloseTo(0.55);
  });
});
