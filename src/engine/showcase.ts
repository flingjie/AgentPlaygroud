import { runTrial, successRateOf, type TrialResult } from './simulator';
import type { CapabilityId, IncidentDef } from '../content/schema';

/** Picks a representative trial: success iff the config's success rate >= 0.5.
 *  Scans seeds deterministically so the UI narrative matches the metrics.
 *
 *  For pedagogical scenarios whose required capabilities still leave the rate
 *  below 0.5, we force a successful showcase when every required capability is
 *  enabled so the completion moment is never undermined by randomness. */
export function pickShowcaseTrial(
  scenario: IncidentDef,
  enabled: ReadonlySet<CapabilityId>,
  seed: number,
): TrialResult {
  const requiredCapabilities = Object.keys(scenario.capabilityEffects) as CapabilityId[];
  const wantSuccess =
    successRateOf(scenario, enabled) >= 0.5 ||
    requiredCapabilities.every((c) => enabled.has(c));
  for (let i = 0; i < 1000; i++) {
    const t = runTrial({ scenario, enabled, seed: seed + i });
    if (t.success === wantSuccess) return t;
  }
  return runTrial({ scenario, enabled, seed });
}
