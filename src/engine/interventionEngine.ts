import type { CapabilityId, IncidentDef, Intervention } from '../content/schema';

export function selectedCapabilities(
  interventions: Intervention[],
  selectedIds: ReadonlySet<string>,
): Set<CapabilityId> {
  const out = new Set<CapabilityId>();
  for (const i of interventions) {
    if (!selectedIds.has(i.id)) continue;
    for (const c of i.grantsCapabilities) out.add(c);
  }
  return out;
}

export function paramRateDelta(
  interventions: Intervention[],
  selectedIds: ReadonlySet<string>,
  paramValues: Record<string, number>,
): number {
  let delta = 0;
  for (const i of interventions) {
    if (!selectedIds.has(i.id)) continue;
    for (const p of i.parameters) {
      const key = `${i.id}.${p.key}`;
      const v = paramValues[key] ?? p.defaultValue;
      const units = (v - p.defaultValue) / p.step;
      delta += units * p.rateDeltaPerUnit;
    }
  }
  return delta;
}

export function successRateWithInterventions(
  def: IncidentDef,
  interventions: Intervention[],
  selectedIds: ReadonlySet<string>,
  paramValues: Record<string, number>,
): number {
  const caps = selectedCapabilities(interventions, selectedIds);
  let p = def.baseSuccess;
  for (const [cap, w] of Object.entries(def.capabilityEffects)) {
    if (caps.has(cap as CapabilityId)) p += w;
  }
  p += paramRateDelta(interventions, selectedIds, paramValues);
  return Math.min(1, Math.max(0, p));
}

export function canCloseIncident(
  interventions: Intervention[],
  selectedIds: ReadonlySet<string>,
  verified: boolean,
): boolean {
  if (!verified) return false;
  const optimals = interventions.filter((i) => i.isOptimal);
  return optimals.length > 0 && optimals.every((i) => selectedIds.has(i.id));
}
