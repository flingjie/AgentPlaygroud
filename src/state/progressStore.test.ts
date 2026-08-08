import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SCENARIOS } from '../content/scenarios';
import { useProgress } from './progressStore';

const { scenarioContent } = vi.hoisted(() => ({
  scenarioContent: {
    title: { en: 'T', zh: 'T' },
    mission: { en: 'm', zh: 'm' },
    failureName: { en: 'f', zh: 'f' },
    failureNarrative: { en: 'n', zh: 'n' },
    missingCapabilityHint: { en: 'h', zh: 'h' },
    explanation: { en: 'e', zh: 'e' },
    patternName: { en: 'p', zh: 'p' },
    patternSummary: { en: 's', zh: 's' },
  },
}));

vi.mock('../content/scenarios', () => ({
  SCENARIOS: [
    {
      def: {
        id: 'inc-000',
        order: 0,
        stage: 'harness',
        hiddenFailure: 'hallucination',
        baseSuccess: 0.05,
        capabilityEffects: {},
        requiredCapabilities: [],
        unlocks: [],
        baseTokenCost: 800,
        trials: 200,
      },
      content: scenarioContent,
    },
    {
      def: {
        id: 'scenario-001',
        order: 1,
        stage: 'harness',
        hiddenFailure: 'hallucination',
        baseSuccess: 0.08,
        capabilityEffects: {},
        requiredCapabilities: [],
        unlocks: ['context-injection', 'tool-registry'],
        baseTokenCost: 1000,
        trials: 200,
      },
      content: scenarioContent,
    },
    {
      def: {
        id: 'scenario-002',
        order: 2,
        stage: 'harness',
        hiddenFailure: 'tool-failure',
        baseSuccess: 0.1,
        capabilityEffects: {},
        requiredCapabilities: [],
        unlocks: ['tool-contract'],
        baseTokenCost: 1200,
        trials: 200,
      },
      content: scenarioContent,
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

  test('completing a scenario records it and merges unlocks into inventory', () => {
    const s001 = SCENARIOS.find(s => s.def.id === 'scenario-001')!.def;
    useProgress.getState().completeScenario(s001);

    expect(useProgress.getState().isCompleted('scenario-001')).toBe(true);
    expect(useProgress.getState().inventory).toContain('context-injection');
    expect(useProgress.getState().inventory).toContain('tool-registry');
  });

  test('repeating completion is idempotent', () => {
    const s001 = SCENARIOS.find(s => s.def.id === 'scenario-001')!.def;
    useProgress.getState().completeScenario(s001);
    useProgress.getState().completeScenario(s001);

    expect(useProgress.getState().completed).toEqual(['scenario-001']);
    expect(useProgress.getState().inventory).toEqual(['context-injection', 'tool-registry']);
  });

  test('isUnlocked returns true for order 0 initially', () => {
    const s000 = SCENARIOS.find(s => s.def.id === 'inc-000')!.def;
    expect(useProgress.getState().isUnlocked(s000)).toBe(true);
  });

  test('isUnlocked returns false for order 1 until order 0 completed', () => {
    const s000 = SCENARIOS.find(s => s.def.id === 'inc-000')!.def;
    const s001 = SCENARIOS.find(s => s.def.id === 'scenario-001')!.def;

    expect(useProgress.getState().isUnlocked(s001)).toBe(false);

    useProgress.getState().completeScenario(s000);

    expect(useProgress.getState().isUnlocked(s001)).toBe(true);
  });

  test('isUnlocked returns false for order 2 before previous completed, true after', () => {
    const s000 = SCENARIOS.find(s => s.def.id === 'inc-000')!.def;
    const s001 = SCENARIOS.find(s => s.def.id === 'scenario-001')!.def;
    const s002 = SCENARIOS.find(s => s.def.id === 'scenario-002')!.def;

    expect(useProgress.getState().isUnlocked(s002)).toBe(false);

    useProgress.getState().completeScenario(s000);
    useProgress.getState().completeScenario(s001);

    expect(useProgress.getState().isUnlocked(s002)).toBe(true);
  });

  test('persists under ais-progress key', () => {
    const s001 = SCENARIOS.find(s => s.def.id === 'scenario-001')!.def;
    useProgress.getState().completeScenario(s001);

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
    vi.doMock('../content/scenarios', () => ({
      SCENARIOS: [
        {
          def: {
            id: 'scenario-001',
            order: 1,
            stage: 'harness',
            hiddenFailure: 'hallucination',
            baseSuccess: 0.08,
            capabilityEffects: {},
            requiredCapabilities: [],
            unlocks: [],
            baseTokenCost: 1000,
            trials: 200,
          },
          content: scenarioContent,
        },
      ],
    }));

    const { useProgress: bridgedProgress } = await import('./progressStore');
    const s001 = {
      id: 'scenario-001',
      order: 1,
      stage: 'harness' as const,
      hiddenFailure: 'hallucination' as const,
      baseSuccess: 0.08,
      capabilityEffects: {},
      requiredCapabilities: [],
      unlocks: [],
      baseTokenCost: 1000,
      trials: 200,
    };

    expect(bridgedProgress.getState().isUnlocked(s001)).toBe(true);
  });
});
