import { mulberry32 } from './rng';
import type { CapabilityId, FailureId, ScenarioDef } from '../content/schema';

export interface TrialInput { scenario: ScenarioDef; enabled: ReadonlySet<CapabilityId>; seed: number; }
export interface TrialResult { success: boolean; failure: FailureId | null; tokenCost: number; steps: number; seed: number; }

export function successRateOf(scenario: ScenarioDef, enabled: ReadonlySet<CapabilityId>): number {
  let p = scenario.baseSuccess;
  for (const [cap, w] of Object.entries(scenario.capabilityEffects))
    if (enabled.has(cap as CapabilityId)) p += w;
  return Math.min(1, Math.max(0, p));
}

export function runTrial({ scenario, enabled, seed }: TrialInput): TrialResult {
  const rng = mulberry32(seed);
  const p = successRateOf(scenario, enabled);
  const success = rng() < p;
  const tokenCost = Math.round(scenario.baseTokenCost * (0.85 + 0.3 * rng()) + enabled.size * 120);
  const steps = 4 + Math.floor(rng() * 4);
  return { success, failure: success ? null : scenario.hiddenFailure, tokenCost, steps, seed };
}

export interface MonteCarloSummary {
  trials: number; successes: number; successRate: number;
  avgTokenCost: number; failureBreakdown: Partial<Record<FailureId, number>>;
}

export function runMonteCarlo(scenario: ScenarioDef, enabled: ReadonlySet<CapabilityId>, seed: number): MonteCarloSummary {
  let successes = 0, tokens = 0;
  const failureBreakdown: Partial<Record<FailureId, number>> = {};
  for (let i = 0; i < scenario.trials; i++) {
    const r = runTrial({ scenario, enabled, seed: seed * 100003 + i });
    if (r.success) successes++;
    else failureBreakdown[r.failure!] = (failureBreakdown[r.failure!] ?? 0) + 1;
    tokens += r.tokenCost;
  }
  return {
    trials: scenario.trials, successes,
    successRate: successes / scenario.trials,
    avgTokenCost: Math.round(tokens / scenario.trials),
    failureBreakdown,
  };
}
