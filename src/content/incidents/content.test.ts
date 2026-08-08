import { INCIDENTS, getIncident } from './index';
import { successRateWithInterventions, canCloseIncident } from '../../engine/interventionEngine';

test('inc-010 registered', () => {
  const i = getIncident('inc-010');
  expect(i).toBeDefined();
  expect(INCIDENTS).toContain(i!);
  expect(i!.content.evidences.length).toBeGreaterThanOrEqual(5);
  expect(i!.content.hypotheses.filter((h) => h.isCorrect)).toHaveLength(1);
  expect(i!.content.interventions.some((x) => x.isOptimal)).toBe(true);
  expect(i!.content.xrayTimeline.length).toBeGreaterThanOrEqual(5);
});

test('inc-010 optimal path improves rate and can close', () => {
  const i = getIncident('inc-010')!;
  const opt = i.content.interventions.filter((x) => x.isOptimal).map((x) => x.id);
  const selected = new Set(opt);
  const after = successRateWithInterventions(i.def, i.content.interventions, selected, {});
  expect(after).toBeGreaterThan(i.def.baseSuccess);
  expect(canCloseIncident(i.content.interventions, selected, true)).toBe(true);
});
