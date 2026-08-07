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
    tokenSum += trace.cost_tokens;

    if (trace.status === 'SUCCESS') {
      successCount++;
    } else if (trace.failure_reason !== 'NONE') {
      // SUCCESS runs carry failure_reason 'NONE' which is not a FailureReason key.
      failureDistribution[trace.failure_reason] =
        (failureDistribution[trace.failure_reason] ?? 0) + 1;
    }

    if (sampleTraces.length < 3) {
      sampleTraces.push(trace);
    }
  }

  return {
    success_rate: n === 0 ? 0 : successCount / n,
    avg_tokens: n === 0 ? 0 : tokenSum / n,
    failure_distribution: failureDistribution,
    sample_traces: sampleTraces,
    runs: n,
  };
}
