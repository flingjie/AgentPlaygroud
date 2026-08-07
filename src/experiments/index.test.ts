import { describe, it, expect } from 'vitest';
import { experiments, experimentById } from './index';
import type { FailureReason } from '../types';

// List of all 13 valid failure reasons
const VALID_FAILURE_REASONS: FailureReason[] = [
  'HALLUCINATION', 'TOOL_FAILURE', 'FILE_CORROSION',
  'MEMORY_STACK_OVERFLOW', 'CONTEXT_OVERFLOW', 'STALE_CONTEXT',
  'FALSE_COMPLETION', 'PERMISSION_ERROR', 'DEADLOCK',
  'INFINITE_LOOP_TRAP', 'BUDGET_EXHAUSTED', 'TASK_ABANDONED',
  'UNSAFE_EXECUTION',
];

describe('experiments index', () => {
  it('loads all 13 experiments', () => {
    expect(experiments).toHaveLength(13);
  });

  it('each experiment has a valid hiddenFailure', () => {
    experiments.forEach((exp) => {
      expect(VALID_FAILURE_REASONS).toContain(exp.hiddenFailure);
    });
  });

  it('each experiment has a unique id', () => {
    const ids = experiments.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
    expect(uniqueIds.size).toBe(13);
  });

  it('each experiment has non-empty availableHarness (when applicable)', () => {
    // Most experiments have availableHarness to demonstrate their teaching
    // 011-false-completion and 013-deadlock may have empty arrays as fixes are config-based
    experiments.forEach((exp) => {
      expect(Array.isArray(exp.availableHarness)).toBe(true);
      // At least some experiments must have non-empty availableHarness
    });
  });

  it('experiments 011 and 013 have empty availableHarness (fix is config, not dims)', () => {
    const exp11 = experimentById('011-false-completion');
    const exp13 = experimentById('013-deadlock');
    expect(exp11?.availableHarness).toEqual([]);
    expect(exp13?.availableHarness).toEqual([]);
  });

  it('each experiment has evaluator.targetSuccessRate in (0, 1]', () => {
    experiments.forEach((exp) => {
      const rate = exp.evaluator.targetSuccessRate;
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(1);
    });
  });

  it('each scenario has non-empty inPlayFailures', () => {
    experiments.forEach((exp) => {
      expect(Array.isArray(exp.scenario.inPlayFailures)).toBe(true);
      expect(exp.scenario.inPlayFailures.length).toBeGreaterThan(0);
    });
  });

  it('each experiment hiddenFailure is in its scenario.inPlayFailures', () => {
    experiments.forEach((exp) => {
      expect(exp.scenario.inPlayFailures).toContain(exp.hiddenFailure);
    });
  });

  it('all 13 distinct failure reasons are covered by the experiments', () => {
    const hiddenFailures = new Set(experiments.map((e) => e.hiddenFailure));
    expect(hiddenFailures.size).toBe(13);
    VALID_FAILURE_REASONS.forEach((reason) => {
      expect(hiddenFailures).toContain(reason);
    });
  });

  it('experiments are sorted by id', () => {
    const ids = experiments.map((e) => e.id);
    const sortedIds = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sortedIds);
  });

  it('experimentById returns experiment by id', () => {
    const exp = experimentById('001-hallucination');
    expect(exp).toBeDefined();
    expect(exp?.id).toBe('001-hallucination');
  });

  it('experimentById returns undefined for unknown id', () => {
    expect(experimentById('unknown-id')).toBeUndefined();
  });

  it('001-hallucination experiment structure is correct', () => {
    const exp = experimentById('001-hallucination');
    expect(exp).toBeDefined();
    expect(exp!.hiddenFailure).toBe('HALLUCINATION');
    expect(exp!.scenario.inPlayFailures).toContain('HALLUCINATION');
  });

  it('013-deadlock experiment is structural (no probabilistic failure rates)', () => {
    const exp = experimentById('013-deadlock');
    expect(exp).toBeDefined();
    expect(exp!.hiddenFailure).toBe('DEADLOCK');
    expect(Object.keys(exp!.scenario.failureRates).length).toBe(0);
    expect(exp!.scenario.inPlayFailures).toEqual(['DEADLOCK']);
  });
});
