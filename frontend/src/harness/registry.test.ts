import { describe, it, expect } from 'vitest';
import { HARNESS_DIMS, RELIABILITY_STACK, dimById } from './registry';
import type { FailureReason, ReliabilityLayerId } from '../types';

describe('HARNESS_DIMS', () => {
  it('should have exactly 7 harness dimensions', () => {
    expect(HARNESS_DIMS).toHaveLength(7);
  });

  it('should have valid category for every dim', () => {
    const validCategories: ReliabilityLayerId[] = [
      'model',
      'tool',
      'workspace',
      'memory',
      'observation',
      'loop_discipline',
      'execution',
    ];

    HARNESS_DIMS.forEach((dim) => {
      expect(validCategories).toContain(dim.category);
    });
  });

  it('should have valid FailureReason in every prevents array', () => {
    const validFailureReasons: FailureReason[] = [
      'HALLUCINATION',
      'TOOL_FAILURE',
      'FILE_CORROSION',
      'MEMORY_STACK_OVERFLOW',
      'CONTEXT_OVERFLOW',
      'STALE_CONTEXT',
      'FALSE_COMPLETION',
      'PERMISSION_ERROR',
      'DEADLOCK',
      'INFINITE_LOOP_TRAP',
      'BUDGET_EXHAUSTED',
      'TASK_ABANDONED',
      'UNSAFE_EXECUTION',
    ];

    HARNESS_DIMS.forEach((dim) => {
      dim.effect.prevents.forEach((reason) => {
        expect(validFailureReasons).toContain(reason);
      });
    });
  });

  it('should have sandbox_isolation requires [tool_registry]', () => {
    const sandboxIsolation = HARNESS_DIMS.find((d) => d.id === 'sandbox_isolation');
    expect(sandboxIsolation?.requires).toEqual(['tool_registry']);
  });

  it('should have permission_layer requires [tool_registry]', () => {
    const permissionLayer = HARNESS_DIMS.find((d) => d.id === 'permission_layer');
    expect(permissionLayer?.requires).toEqual(['tool_registry']);
  });

  it('should have retry_policy successRate of 0', () => {
    const retryPolicy = HARNESS_DIMS.find((d) => d.id === 'retry_policy');
    expect(retryPolicy?.effect.successRate).toBe(0);
  });

  it('should have tool_registry first (ordered by layer then id)', () => {
    expect(HARNESS_DIMS[0].id).toBe('tool_registry');
  });

  it('should have timeout_guard last', () => {
    expect(HARNESS_DIMS[6].id).toBe('timeout_guard');
  });

  it('should have correct order matching spec: tool_registry, sandbox_isolation, permission_layer, state_persistence, context_manager, retry_policy, timeout_guard', () => {
    expect(HARNESS_DIMS.map((d) => d.id)).toEqual([
      'tool_registry',
      'sandbox_isolation',
      'permission_layer',
      'state_persistence',
      'context_manager',
      'retry_policy',
      'timeout_guard',
    ]);
  });

  it('should have all non-retry_policy dims with successRate 0.1', () => {
    HARNESS_DIMS.forEach((dim) => {
      if (dim.id === 'retry_policy') {
        expect(dim.effect.successRate).toBe(0);
      } else {
        expect(dim.effect.successRate).toBe(0.1);
      }
    });
  });
});

describe('RELIABILITY_STACK', () => {
  it('should have exactly 7 layers', () => {
    expect(RELIABILITY_STACK).toHaveLength(7);
  });

  it('should be ordered model→execution', () => {
    expect(RELIABILITY_STACK[0].id).toBe('model');
    expect(RELIABILITY_STACK[1].id).toBe('tool');
    expect(RELIABILITY_STACK[2].id).toBe('workspace');
    expect(RELIABILITY_STACK[3].id).toBe('memory');
    expect(RELIABILITY_STACK[4].id).toBe('observation');
    expect(RELIABILITY_STACK[5].id).toBe('loop_discipline');
    expect(RELIABILITY_STACK[6].id).toBe('execution');
  });

  it('should have correct order property for each layer', () => {
    expect(RELIABILITY_STACK[0].order).toBe(0);
    expect(RELIABILITY_STACK[1].order).toBe(1);
    expect(RELIABILITY_STACK[2].order).toBe(2);
    expect(RELIABILITY_STACK[3].order).toBe(3);
    expect(RELIABILITY_STACK[4].order).toBe(4);
    expect(RELIABILITY_STACK[5].order).toBe(5);
    expect(RELIABILITY_STACK[6].order).toBe(6);
  });
});

describe('dimById', () => {
  it('should find a dim by id', () => {
    expect(dimById('tool_registry')?.id).toBe('tool_registry');
    expect(dimById('timeout_guard')?.id).toBe('timeout_guard');
  });

  it('should return undefined for unknown id', () => {
    expect(dimById('unknown_id')).toBeUndefined();
  });
});
