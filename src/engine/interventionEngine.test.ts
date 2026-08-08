import {
  selectedCapabilities, successRateWithInterventions, canCloseIncident,
} from './interventionEngine';
import type { IncidentDef, Intervention } from '../content/schema';

const def: IncidentDef = {
  id: 'inc-010', order: 10, stage: 'loop', hiddenFailure: 'false-completion',
  baseSuccess: 0.15,
  capabilityEffects: { 'evidence-loop': 0.70 },
  unlocks: ['evidence-loop'], baseTokenCost: 5600, trials: 200,
  incidentMeta: {
    severity: 'P1', affectedSystems: [{ en: 'auth', zh: 'auth' }],
    reportedAt: '2026-08-08T14:32:00Z',
    alertSummary: { en: 'a', zh: 'a' }, agentClaim: { en: 'done', zh: 'done' },
  },
};

const optimal: Intervention = {
  id: 'ev-loop', name: { en: 'Evidence Loop', zh: '证据循环' },
  description: { en: 'd', zh: 'd' }, configDiff: { en: 'code', zh: 'code' },
  parameters: [{
    key: 'minTests', label: { en: 'Min tests', zh: '最少测试' },
    min: 1, max: 5, step: 1, defaultValue: 1, rateDeltaPerUnit: 0.02,
  }],
  grantsCapabilities: ['evidence-loop'], isOptimal: true,
  tradeoff: { en: 't', zh: 't' },
};

const suboptimal: Intervention = {
  id: 'prompt-only', name: { en: 'Prompt only', zh: '仅 Prompt' },
  description: { en: 'd', zh: 'd' }, configDiff: { en: 'c', zh: 'c' },
  parameters: [], grantsCapabilities: [], isOptimal: false,
  tradeoff: { en: 't', zh: 't' },
};

test('selectedCapabilities unions grants', () => {
  expect([...selectedCapabilities([optimal, suboptimal], new Set(['ev-loop']))])
    .toEqual(['evidence-loop']);
});

test('successRateWithInterventions uses effects + param delta', () => {
  const p = successRateWithInterventions(def, [optimal], new Set(['ev-loop']), {
    'ev-loop.minTests': 3, // +2 units * 0.02 = +0.04
  });
  expect(p).toBeCloseTo(0.15 + 0.70 + 0.04);
});

test('canCloseIncident requires all optimal selected and verified', () => {
  expect(canCloseIncident([optimal, suboptimal], new Set(['ev-loop']), true)).toBe(true);
  expect(canCloseIncident([optimal, suboptimal], new Set(['prompt-only']), true)).toBe(false);
  expect(canCloseIncident([optimal], new Set(['ev-loop']), false)).toBe(false);
});
