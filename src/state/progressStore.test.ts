import { beforeEach, describe, expect, test } from 'vitest';
import { SCENARIOS } from '../content/scenarios';
import { useProgress } from './progressStore';

vi.mock('../content/scenarios', () => ({
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
        unlocks: ['context-injection', 'tool-registry'],
        baseTokenCost: 1000,
        trials: 200,
      },
      content: {
        title: { en: 'S001', zh: 'S001' },
        mission: { en: 'm', zh: 'm' },
        failureName: { en: 'f', zh: 'f' },
        failureNarrative: { en: 'n', zh: 'n' },
        missingCapabilityHint: { en: 'h', zh: 'h' },
        explanation: { en: 'e', zh: 'e' },
        patternName: { en: 'p', zh: 'p' },
        patternSummary: { en: 's', zh: 's' },
      },
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
      content: {
        title: { en: 'S002', zh: 'S002' },
        mission: { en: 'm', zh: 'm' },
        failureName: { en: 'f', zh: 'f' },
        failureNarrative: { en: 'n', zh: 'n' },
        missingCapabilityHint: { en: 'h', zh: 'h' },
        explanation: { en: 'e', zh: 'e' },
        patternName: { en: 'p', zh: 'p' },
        patternSummary: { en: 's', zh: 's' },
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

  test('isUnlocked returns false for order 2 before previous completed, true after', () => {
    const s002 = SCENARIOS.find(s => s.def.id === 'scenario-002')!.def;
    expect(useProgress.getState().isUnlocked(s002)).toBe(false);

    const s001 = SCENARIOS.find(s => s.def.id === 'scenario-001')!.def;
    useProgress.getState().completeScenario(s001);

    expect(useProgress.getState().isUnlocked(s002)).toBe(true);
  });
});
