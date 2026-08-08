import type { IncidentDef } from '../content/schema';
import { runMonteCarlo, runMonteCarloAtRate, runTrial, successRateOf } from './simulator';

const inc000: IncidentDef = {
  id: 'inc-000', order: 0, stage: 'llm', hiddenFailure: 'hallucination',
  baseSuccess: 0.08,
  capabilityEffects: { 'context-injection': 0.22, 'tool-registry': 0.05 },
  unlocks: ['context-injection', 'tool-registry'],
  baseTokenCost: 1800, trials: 200,
  incidentMeta: {
    severity: 'P2',
    affectedSystems: [{ en: 'svc', zh: 'svc' }],
    reportedAt: '2026-07-02T09:14:00Z',
    alertSummary: { en: 'a', zh: 'a' },
    agentClaim: { en: 'a', zh: 'a' },
  },
};

test('successRateOf is additive and clamped', () => {
  expect(successRateOf(inc000, new Set())).toBeCloseTo(0.08);
  expect(successRateOf(inc000, new Set(['context-injection']))).toBeCloseTo(0.30);
  expect(successRateOf(inc000, new Set(['context-injection', 'tool-registry']))).toBeCloseTo(0.35);
});
test('irrelevant capability has zero effect', () => {
  expect(successRateOf(inc000, new Set(['sandbox']))).toBeCloseTo(0.08);
});
test('monte carlo converges to configured rate', () => {
  const s = runMonteCarlo(inc000, new Set(), 1);
  expect(s.trials).toBe(200);
  expect(Math.abs(s.successRate - 0.08)).toBeLessThan(0.06);
});
test('same seed same result', () => {
  expect(runTrial({ scenario: inc000, enabled: new Set(), seed: 99 }))
    .toEqual(runTrial({ scenario: inc000, enabled: new Set(), seed: 99 }));
});
test('failed trial carries the hidden failure id', () => {
  const r = runTrial({ scenario: inc000, enabled: new Set(), seed: 5 });
  if (!r.success) expect(r.failure).toBe('hallucination');
});

test('runMonteCarloAtRate is deterministic for the same seed and rate', () => {
  const a = runMonteCarloAtRate(100, 1000, 'hallucination', 0.25, 12345);
  const b = runMonteCarloAtRate(100, 1000, 'hallucination', 0.25, 12345);
  expect(a).toEqual(b);
  expect(a.trials).toBe(100);
  expect(a.successRate).toBeGreaterThanOrEqual(0);
  expect(a.successRate).toBeLessThanOrEqual(1);
  expect(a.avgTokenCost).toBeGreaterThan(0);
});
