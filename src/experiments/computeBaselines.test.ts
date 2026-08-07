import { describe, it, expect } from 'vitest';
import { experiments } from './index';
import { computeBaselines, assertBaselineDominance } from './computeBaselines';

describe('computeBaselines', () => {
  const withBaselines = computeBaselines(experiments, 300);

  it('fills a baseline for every experiment', () => {
    for (const spec of withBaselines) {
      expect(spec.baseline).toBeDefined();
      expect(spec.baseline.successRate).toBeGreaterThanOrEqual(0);
      expect(spec.baseline.successRate).toBeLessThanOrEqual(1);
      expect(spec.baseline.tokenCost).toBeGreaterThan(0);
    }
  });

  it('produces a valid failureDistribution', () => {
    for (const spec of withBaselines) {
      const dist = spec.baseline.failureDistribution;
      const total = Object.values(dist).reduce((a: number, b) => a + (b ?? 0), 0);
      const runs = 300;
      expect(total).toBeLessThanOrEqual(runs);
    }
  });

  it('all 13 experiments have their hidden failure as the dominant baseline failure', () => {
    const issues = assertBaselineDominance(withBaselines);
    for (const i of issues) {
      // eslint-disable-next-line no-console
      console.log(
        `${i.id}: hidden=${i.hidden} dom-by=${i.top}(${i.topCount})`
      );
    }
    expect(issues).toHaveLength(0);
  });
});
