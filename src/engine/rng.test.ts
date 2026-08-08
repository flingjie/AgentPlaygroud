import { mulberry32 } from './rng';
test('deterministic for same seed', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 100; i++) expect(a()).toBe(b());
});
test('different seeds diverge', () => {
  expect(mulberry32(1)()).not.toBe(mulberry32(2)());
});
test('output in [0,1)', () => {
  const r = mulberry32(7);
  for (let i = 0; i < 1000; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
});
