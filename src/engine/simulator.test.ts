import type { ScenarioDef } from '../content/schema';
import { runMonteCarlo, runTrial, successRateOf } from './simulator';

const s001: ScenarioDef = {
  id: 'scenario-001', order: 1, stage: 'harness', hiddenFailure: 'hallucination',
  baseSuccess: 0.08,
  capabilityEffects: { 'context-injection': 0.22, 'tool-registry': 0.05 },
  requiredCapabilities: ['context-injection', 'tool-registry'],
  unlocks: ['context-injection', 'tool-registry'],
  baseTokenCost: 1800, trials: 200,
};

test('successRateOf is additive and clamped', () => {
  expect(successRateOf(s001, new Set())).toBeCloseTo(0.08);
  expect(successRateOf(s001, new Set(['context-injection']))).toBeCloseTo(0.30);
  expect(successRateOf(s001, new Set(['context-injection', 'tool-registry']))).toBeCloseTo(0.35);
});
test('irrelevant capability has zero effect', () => {
  expect(successRateOf(s001, new Set(['sandbox']))).toBeCloseTo(0.08);
});
test('monte carlo converges to configured rate', () => {
  const s = runMonteCarlo(s001, new Set(), 1);
  expect(s.trials).toBe(200);
  expect(Math.abs(s.successRate - 0.08)).toBeLessThan(0.06);
});
test('same seed same result', () => {
  expect(runTrial({ scenario: s001, enabled: new Set(), seed: 99 }))
    .toEqual(runTrial({ scenario: s001, enabled: new Set(), seed: 99 }));
});
test('failed trial carries the hidden failure id', () => {
  const r = runTrial({ scenario: s001, enabled: new Set(), seed: 5 });
  if (!r.success) expect(r.failure).toBe('hallucination');
});
