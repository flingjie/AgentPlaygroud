import { describe, it, expect } from 'vitest';
import { SeededRng, deriveRunSeed } from './rng';

describe('SeededRng', () => {
  it('produces identical sequences for the same seed', () => {
    const rng1 = new SeededRng(42);
    const rng2 = new SeededRng(42);

    for (let i = 0; i < 5; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = new SeededRng(42);
    const rng2 = new SeededRng(43);

    const values1 = Array.from({ length: 5 }, () => rng1.next());
    const values2 = Array.from({ length: 5 }, () => rng2.next());

    expect(values1).not.toEqual(values2);
  });

  it('produces the classic mulberry32 sequence for seed 0', () => {
    const rng = new SeededRng(0);
    // Standard bryc mulberry32 reference values for seed 0 (canonical)
    const expected = [0.2664292087, 0.0003297457, 0.2232720274, 0.1462021479, 0.4673278229];

    for (const exp of expected) {
      expect(rng.next()).toBeCloseTo(exp, 10);
    }
  });

  it('returns int within the specified range', () => {
    const rng = new SeededRng(123);

    for (let i = 0; i < 100; i++) {
      const value = rng.int(1, 6);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('returns int at boundaries correctly', () => {
    const rng = new SeededRng(456);

    // Test that we can hit boundaries over many rolls
    const values = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      values.add(rng.int(1, 6));
    }
    expect(values.has(1)).toBe(true);
    expect(values.has(6)).toBe(true);
  });

  it('chance(1) always returns true', () => {
    const rng = new SeededRng(789);

    for (let i = 0; i < 100; i++) {
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('chance(0) always returns false', () => {
    const rng = new SeededRng(789);

    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false);
    }
  });

  it('chance(0.5) returns both true and false over many trials', () => {
    const rng = new SeededRng(999);
    const results: boolean[] = [];

    for (let i = 0; i < 1000; i++) {
      results.push(rng.chance(0.5));
    }

    expect(results.some(r => r)).toBe(true);
    expect(results.some(r => !r)).toBe(true);
  });

  it('pick returns a member of the array', () => {
    const rng = new SeededRng(111);
    const arr = ['a', 'b', 'c', 'd', 'e'];

    for (let i = 0; i < 100; i++) {
      const picked = rng.pick(arr);
      expect(arr).toContain(picked);
    }
  });

  it('pick throws on empty array', () => {
    const rng = new SeededRng(222);
    expect(() => rng.pick([])).toThrow('Cannot pick from an empty array');
  });

  it('int throws when min > max', () => {
    const rng = new SeededRng(333);
    expect(() => rng.int(6, 1)).toThrow('Invalid range');
  });
});

describe('deriveRunSeed', () => {
  it('returns baseSeed + i as unsigned 32-bit', () => {
    expect(deriveRunSeed(0, 3)).toBe(3);
    expect(deriveRunSeed(100, 0)).toBe(100);
    expect(deriveRunSeed(100, 1)).toBe(101);
    expect(deriveRunSeed(100, 5)).toBe(105);
  });

  it('wraps around at 32-bit boundary', () => {
    expect(deriveRunSeed(0xffffffff, 1)).toBe(0);
    expect(deriveRunSeed(0xfffffffe, 3)).toBe(1);
  });
});
