import { describe, expect, test } from 'vitest';
import { pickShowcaseTrial } from './showcase';
import type { ScenarioDef } from '../content/schema';

const fixture: ScenarioDef = {
  id: 'scenario-001',
  order: 1,
  stage: 'harness',
  hiddenFailure: 'hallucination',
  baseSuccess: 0.08,
  capabilityEffects: { 'context-injection': 0.22, 'tool-registry': 0.05 },
  requiredCapabilities: ['context-injection', 'tool-registry'],
  unlocks: ['context-injection', 'tool-registry'],
  baseTokenCost: 1800,
  trials: 200,
};

describe('pickShowcaseTrial', () => {
  test('baseline without capabilities always fails deterministically', () => {
    const r = pickShowcaseTrial(fixture, new Set(), 1);
    expect(r.success).toBe(false);
  });

  test('fully-capable scenario succeeds deterministically', () => {
    const r = pickShowcaseTrial(fixture, new Set(['context-injection', 'tool-registry']), 1);
    expect(r.success).toBe(true);
  });
});
