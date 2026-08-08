import { beforeEach, describe, expect, test, vi } from 'vitest';
import { INCIDENTS } from '../content/incidents';
import { useProgress } from './progressStore';

vi.mock('../content/incidents', () => ({
  INCIDENTS: [
    {
      def: {
        id: 'inc-000',
        order: 0,
        stage: 'llm',
        hiddenFailure: 'hallucination',
        baseSuccess: 0.08,
        capabilityEffects: {},
        unlocks: ['context-injection', 'tool-registry'],
        baseTokenCost: 1800,
        trials: 200,
      },
    },
    {
      def: {
        id: 'inc-001',
        order: 1,
        stage: 'harness',
        hiddenFailure: 'tool-failure',
        baseSuccess: 0.3,
        capabilityEffects: {},
        unlocks: ['tool-contract', 'retry-policy'],
        baseTokenCost: 2400,
        trials: 200,
      },
    },
    {
      def: {
        id: 'inc-002',
        order: 2,
        stage: 'harness',
        hiddenFailure: 'unsafe-execution',
        baseSuccess: 0.4,
        capabilityEffects: {},
        unlocks: ['sandbox', 'permission-gate'],
        baseTokenCost: 3200,
        trials: 200,
      },
    },
  ],
}));

describe('progress store', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgress.setState({ completed: [], inventory: [] });
  });

  test('initial inventory is empty', () => {
    expect(useProgress.getState().inventory).toEqual([]);
  });

  test('completing an incident records it and merges unlocks into inventory', () => {
    const s001 = INCIDENTS.find(s => s.def.id === 'inc-001')!.def;
    useProgress.getState().completeIncident(s001);

    expect(useProgress.getState().isCompleted('inc-001')).toBe(true);
    expect(useProgress.getState().inventory).toContain('tool-contract');
    expect(useProgress.getState().inventory).toContain('retry-policy');
  });

  test('repeating completion is idempotent', () => {
    const s001 = INCIDENTS.find(s => s.def.id === 'inc-001')!.def;
    useProgress.getState().completeIncident(s001);
    useProgress.getState().completeIncident(s001);

    expect(useProgress.getState().completed).toEqual(['inc-001']);
    expect(useProgress.getState().inventory).toEqual(['tool-contract', 'retry-policy']);
  });

  test('isUnlocked returns true for order 0 initially', () => {
    const s000 = INCIDENTS.find(s => s.def.id === 'inc-000')!.def;
    expect(useProgress.getState().isUnlocked(s000)).toBe(true);
  });

  test('isUnlocked returns false for order 1 until order 0 completed', () => {
    const s000 = INCIDENTS.find(s => s.def.id === 'inc-000')!.def;
    const s001 = INCIDENTS.find(s => s.def.id === 'inc-001')!.def;

    expect(useProgress.getState().isUnlocked(s001)).toBe(false);

    useProgress.getState().completeIncident(s000);

    expect(useProgress.getState().isUnlocked(s001)).toBe(true);
  });

  test('isUnlocked returns false for order 2 before previous completed, true after', () => {
    const s000 = INCIDENTS.find(s => s.def.id === 'inc-000')!.def;
    const s001 = INCIDENTS.find(s => s.def.id === 'inc-001')!.def;
    const s002 = INCIDENTS.find(s => s.def.id === 'inc-002')!.def;

    expect(useProgress.getState().isUnlocked(s002)).toBe(false);

    useProgress.getState().completeIncident(s000);
    useProgress.getState().completeIncident(s001);

    expect(useProgress.getState().isUnlocked(s002)).toBe(true);
  });

  test('persists under ais-progress key', () => {
    const s001 = INCIDENTS.find(s => s.def.id === 'inc-001')!.def;
    useProgress.getState().completeIncident(s001);

    expect(localStorage.getItem('ais-progress')).not.toBeNull();
    expect(localStorage.getItem('aes-progress')).toBeNull();
  });
});

describe('progress store bridge (no order 0 in registry)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  test('isUnlocked returns true for order 1 when registry lacks order 0', async () => {
    vi.doMock('../content/incidents', () => ({
      INCIDENTS: [
        {
          def: {
            id: 'inc-001',
            order: 1,
            stage: 'harness',
            hiddenFailure: 'tool-failure',
            baseSuccess: 0.3,
            capabilityEffects: {},
            unlocks: [],
            baseTokenCost: 2400,
            trials: 200,
          },
        },
      ],
    }));

    const { useProgress: bridgedProgress } = await import('./progressStore');
    const s001 = {
      id: 'inc-001',
      order: 1,
      stage: 'harness' as const,
      hiddenFailure: 'tool-failure' as const,
      baseSuccess: 0.3,
      capabilityEffects: {},
      unlocks: [],
      baseTokenCost: 2400,
      trials: 200,
    };

    expect(bridgedProgress.getState().isUnlocked(s001)).toBe(true);
  });
});
