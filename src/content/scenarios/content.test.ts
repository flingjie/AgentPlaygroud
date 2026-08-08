import { CAPABILITIES } from '../capabilities';
import { SCENARIOS } from './index';
import { successRateOf } from '../../engine/simulator';

const VALID_CAPABILITY_IDS = new Set(Object.keys(CAPABILITIES));
const CONTENT_FIELDS = [
  'title',
  'mission',
  'failureName',
  'failureNarrative',
  'missingCapabilityHint',
  'explanation',
  'patternName',
  'patternSummary',
] as const;

test('SCENARIOS has exactly 13 entries', () => {
  expect(SCENARIOS).toHaveLength(13);
});

test('orders are exactly 1..13 unique', () => {
  const orders = SCENARIOS.map(s => s.def.order).sort((a, b) => a - b);
  expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  const ids = SCENARIOS.map(s => s.def.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('every requiredCapability is unlocked by this or an earlier scenario', () => {
  const unlocked = new Set<string>();
  for (const scenario of SCENARIOS) {
    const available = new Set(unlocked);
    for (const unlock of scenario.def.unlocks) {
      available.add(unlock);
    }
    for (const required of scenario.def.requiredCapabilities) {
      expect(available.has(required)).toBe(true);
    }
    for (const unlock of scenario.def.unlocks) {
      unlocked.add(unlock);
    }
  }
});

test('every content field has non-empty bilingual text', () => {
  for (const scenario of SCENARIOS) {
    for (const field of CONTENT_FIELDS) {
      const text = scenario.content[field];
      expect(text.en.trim()).not.toBe('');
      expect(text.zh.trim()).not.toBe('');
    }
  }
});

test('every capabilityEffects key is a valid CapabilityId', () => {
  for (const scenario of SCENARIOS) {
    for (const key of Object.keys(scenario.def.capabilityEffects)) {
      expect(VALID_CAPABILITY_IDS.has(key)).toBe(true);
    }
  }
});

test('required capabilities always improve success rate over baseline', () => {
  for (const scenario of SCENARIOS) {
    const baseline = successRateOf(scenario.def, new Set());
    const withRequired = successRateOf(scenario.def, new Set(scenario.def.requiredCapabilities));
    expect(withRequired).toBeGreaterThan(baseline);
  }
});
