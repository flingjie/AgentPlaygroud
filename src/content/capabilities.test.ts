import { CAPABILITIES } from './capabilities';

test('CAPABILITIES has exactly 19 entries', () => {
  expect(Object.keys(CAPABILITIES)).toHaveLength(19);
});

test('every capability has non-empty bilingual name and desc', () => {
  for (const entry of Object.values(CAPABILITIES)) {
    expect(entry.name.en.trim()).not.toBe('');
    expect(entry.name.zh.trim()).not.toBe('');
    expect(entry.desc.en.trim()).not.toBe('');
    expect(entry.desc.zh.trim()).not.toBe('');
  }
});

test('includes reliability capabilities', () => {
  for (const id of ['evaluation-harness', 'observability-stack', 'deterministic-replay'] as const) {
    expect(CAPABILITIES[id].name.en.length).toBeGreaterThan(0);
    expect(CAPABILITIES[id].name.zh.length).toBeGreaterThan(0);
  }
  expect(Object.keys(CAPABILITIES)).toHaveLength(19);
});
