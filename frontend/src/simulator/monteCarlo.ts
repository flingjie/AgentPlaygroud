import type { MonteCarloResult, SimConfig } from '../types';
import { simulateRun } from './runtimeSimulator';
import { deriveRunSeed } from './rng';

/**
 * Run N deterministic Monte Carlo simulations and aggregate the results.
 * Same baseSeed + runs always produces an identical result object.
 */
export function simulateMonteCarlo(
  config: SimConfig,
  baseSeed: number,
  runs: number
): MonteCarloResult {
  const n = Math.min(runs, 100);
  let successCount = 0;
  let tokenSum = 0;
  const failureDistribution: Record<string, number> = {};
  const sampleTraces: ReturnType<typeof simulateRun>[] = [];

  for (let i = 0; i < n; i++) {
    const trace = simulateRun(config, deriveRunSeed(baseSeed, i));
    tokenSum += trace.costTokens;

    if (trace.status === 'SUCCESS') {
      successCount++;
    } else if (trace.failureReason !== 'NONE') {
      // SUCCESS runs carry failureReason 'NONE' which is not a FailureReason key.
      failureDistribution[trace.failureReason] =
        (failureDistribution[trace.failureReason] ?? 0) + 1;
    }

    if (sampleTraces.length < 3) {
      sampleTraces.push(trace);
    }
  }

  return {
    successRate: n === 0 ? 0 : successCount / n,
    avgTokens: n === 0 ? 0 : tokenSum / n,
    failureDistribution,
    sampleTraces,
    runs: n,
  };
}
