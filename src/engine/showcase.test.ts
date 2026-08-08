import { describe, expect, test } from 'vitest';
import { pickShowcaseTrial } from './showcase';
import type { IncidentDef } from '../content/schema';

const fixture: IncidentDef = {
  id: 'inc-000',
  order: 0,
  stage: 'llm',
  hiddenFailure: 'hallucination',
  baseSuccess: 0.08,
  capabilityEffects: { 'context-injection': 0.22, 'tool-registry': 0.05 },
  unlocks: ['context-injection', 'tool-registry'],
  baseTokenCost: 1800,
  trials: 200,
  incidentMeta: {
    severity: 'P2',
    affectedSystems: [{ en: 'svc', zh: 'svc' }],
    reportedAt: '2026-07-02T09:14:00Z',
    alertSummary: { en: 'a', zh: 'a' },
    agentClaim: { en: 'a', zh: 'a' },
  },
};

describe('pickShowcaseTrial', () => {
  test('baseline without capabilities always fails deterministically', () => {
    const r = pickShowcaseTrial(fixture, new Set(), 1);
    expect(r.success).toBe(false);
  });

  test('fully-capable incident succeeds deterministically', () => {
    const r = pickShowcaseTrial(fixture, new Set(['context-injection', 'tool-registry']), 1);
    expect(r.success).toBe(true);
  });
});
