import { describe, it, expect } from 'vitest';
import { RAW_MODEL_BLUEPRINT, RAW_MODEL_SEED, toSimConfig } from './constants';
import { simulateRun } from './runtimeSimulator';

describe('RAW_MODEL_BLUEPRINT', () => {
  it('produces a FAILED trace deterministically', () => {
    const config = toSimConfig(RAW_MODEL_BLUEPRINT);
    const trace = simulateRun(config, RAW_MODEL_SEED);

    expect(trace).toBeDefined();
    expect(trace.status).toBe('FAILED');
    expect(trace.seed).toBe(RAW_MODEL_SEED);
    expect(trace.cost_tokens).toBeGreaterThan(0);
    expect(trace.steps.length).toBeGreaterThan(0);
  });

  it('is 100% reproducible — same seed = same trace', () => {
    const config = toSimConfig(RAW_MODEL_BLUEPRINT);

    const trace1 = simulateRun(config, RAW_MODEL_SEED);
    const trace2 = simulateRun(config, RAW_MODEL_SEED);

    expect(trace1.run_id).toBe(trace2.run_id);
    expect(trace1.status).toBe(trace2.status);
    expect(trace1.failure_reason).toBe(trace2.failure_reason);
    expect(trace1.cost_tokens).toBe(trace2.cost_tokens);
    expect(trace1.steps.length).toBe(trace2.steps.length);
    expect(trace1.topology).toEqual(trace2.topology);
    expect(trace1.steps.map((s) => s.action)).toEqual(trace2.steps.map((s) => s.action));
  });

  it('has all harness dimensions disabled', () => {
    const h = RAW_MODEL_BLUEPRINT.harness;
    expect(h.has_tool_registry).toBe(false);
    expect(h.has_retry_policy).toBe(false);
    expect(h.has_timeout_guard).toBe(false);
    expect(h.has_sandbox_isolation).toBe(false);
    expect(h.has_context_manager).toBe(false);
    expect(h.has_state_persistence).toBe(false);
    expect(h.has_permission_layer).toBe(false);
  });

  it('has loop disabled', () => {
    expect(RAW_MODEL_BLUEPRINT.loop.enabled).toBe(false);
  });

  it('has loop_stack disabled', () => {
    expect(RAW_MODEL_BLUEPRINT.loop_stack.enabled).toBe(false);
  });

  it('defaults to a single-coder graph with no edges', () => {
    const g = RAW_MODEL_BLUEPRINT.graph;
    expect(g.nodes).toHaveLength(1);
    expect(g.nodes[0].role).toBe('coder');
    expect(g.edges).toHaveLength(0);
    expect(g.checkpointing).toBe(false);
  });
});
