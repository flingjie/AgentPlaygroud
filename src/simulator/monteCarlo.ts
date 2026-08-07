import type { MonteCarloResult, SimConfig } from '../types';
import type { TraceMonteCarloResult } from '../types/events';
import { simulateRun, simulateRunV2 } from './runtimeSimulator';
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

// ==================== V2 Wrapper ====================

/**
 * Run N deterministic Monte Carlo simulations and return V2 Trace results.
 * Same baseSeed + runs always produces an identical result object.
 */
export function simulateMonteCarloV2(
  config: SimConfig,
  seed: number,
  runs: number = 100,
): TraceMonteCarloResult {
  const result = simulateMonteCarlo(config, seed, runs);

  // Convert sample traces to V2 format — re-simulate with the same seeds
  const v2Traces = result.sample_traces.map((t) =>
    simulateRunV2(config, t.seed ?? seed),
  );

  return {
    successRate: result.success_rate,
    avgTokens: result.avg_tokens,
    failureDistribution: result.failure_distribution,
    sampleTraces: v2Traces,
    runs: result.runs,
  };
}
