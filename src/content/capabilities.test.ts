import { CAPABILITIES } from './capabilities';

test('CAPABILITIES has exactly 16 entries', () => {
  expect(Object.keys(CAPABILITIES)).toHaveLength(16);
});

test('every capability has non-empty bilingual name and desc', () => {
  for (const entry of Object.values(CAPABILITIES)) {
    expect(entry.name.en.trim()).not.toBe('');
    expect(entry.name.zh.trim()).not.toBe('');
    expect(entry.desc.en.trim()).not.toBe('');
    expect(entry.desc.zh.trim()).not.toBe('');
  }
});
