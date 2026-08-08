import { INCIDENTS, getIncident } from './index';
import { successRateWithInterventions, canCloseIncident } from '../../engine/interventionEngine';
import type { CapabilityId, Incident, LocalizedText } from '../schema';

const LEVEL_IDS = [
  'inc-000',
  'inc-001',
  'inc-002',
  'inc-003',
  'inc-004',
  'inc-005',
  'inc-006',
  'inc-007',
  'inc-008',
  'inc-009',
  'inc-010',
  'inc-011',
  'inc-012',
  'inc-013',
  'inc-014',
  'inc-015',
];

const DEF_TABLE: Record<
  string,
  {
    order: number;
    stage: string;
    failure: string;
    base: number;
    effects: Record<string, number>;
    unlocks: string[];
    token: number;
  }
> = {
  'inc-000': { order: 0, stage: 'llm', failure: 'hallucination', base: 0.08, effects: { 'context-injection': 0.22, 'tool-registry': 0.05 }, unlocks: ['context-injection', 'tool-registry'], token: 1800 },
  'inc-001': { order: 1, stage: 'harness', failure: 'tool-failure', base: 0.3, effects: { 'tool-contract': 0.15, 'retry-policy': 0.3 }, unlocks: ['tool-contract', 'retry-policy'], token: 2400 },
  'inc-002': { order: 2, stage: 'harness', failure: 'unsafe-execution', base: 0.4, effects: { sandbox: 0.2, 'permission-gate': 0.1 }, unlocks: ['sandbox', 'permission-gate'], token: 3200 },
  'inc-003': { order: 3, stage: 'harness', failure: 'permission-error', base: 0.35, effects: { 'permission-gate': 0.25, 'tool-contract': 0.12 }, unlocks: [], token: 2600 },
  'inc-004': { order: 4, stage: 'harness', failure: 'state-corruption', base: 0.3, effects: { checkpointing: 0.48 }, unlocks: ['checkpointing'], token: 4100 },
  'inc-005': { order: 5, stage: 'harness', failure: 'memory-failure', base: 0.35, effects: { 'memory-management': 0.39 }, unlocks: ['memory-management'], token: 5200 },
  'inc-006': { order: 6, stage: 'harness', failure: 'context-overflow', base: 0.28, effects: { 'context-engineering': 0.48 }, unlocks: ['context-engineering'], token: 6800 },
  'inc-007': { order: 7, stage: 'harness', failure: 'stale-context', base: 0.33, effects: { 'observation-loop': 0.46 }, unlocks: ['observation-loop'], token: 3900 },
  'inc-008': { order: 8, stage: 'loop', failure: 'task-abandoned', base: 0.25, effects: { 'recovery-loop': 0.45 }, unlocks: ['recovery-loop'], token: 7400 },
  'inc-009': { order: 9, stage: 'loop', failure: 'infinite-loop', base: 0.20, effects: { 'stop-rule': 0.53 }, unlocks: ['stop-rule'], token: 9100 },
  'inc-010': { order: 10, stage: 'loop', failure: 'false-completion', base: 0.15, effects: { 'evidence-loop': 0.70 }, unlocks: ['evidence-loop'], token: 5600 },
  'inc-011': { order: 11, stage: 'loop', failure: 'budget-exhausted', base: 0.30, effects: { 'budget-guard': 0.47 }, unlocks: ['budget-guard'], token: 12000 },
  'inc-012': { order: 12, stage: 'graph', failure: 'deadlock', base: 0.10, effects: { 'graph-orchestration': 0.55, 'human-gate': 0.17 }, unlocks: ['graph-orchestration', 'human-gate'], token: 15000 },
  'inc-013': { order: 13, stage: 'reliability', failure: 'evaluation-gap', base: 0.25, effects: { 'evaluation-harness': 0.50 }, unlocks: ['evaluation-harness'], token: 8000 },
  'inc-014': { order: 14, stage: 'reliability', failure: 'no-observability', base: 0.20, effects: { 'observability-stack': 0.55 }, unlocks: ['observability-stack'], token: 7500 },
  'inc-015': { order: 15, stage: 'reliability', failure: 'no-replay', base: 0.18, effects: { 'deterministic-replay': 0.57 }, unlocks: ['deterministic-replay'], token: 9000 },
};

test('all 16 incidents inc-000…015 are registered in order with continuous orders 0..15', () => {
  for (const id of LEVEL_IDS) {
    const i = getIncident(id);
    expect(i, id).toBeDefined();
    expect(INCIDENTS).toContain(i!);
  }
  expect(INCIDENTS).toHaveLength(16);
  const orders = INCIDENTS.map((i) => i.def.order).sort((a, b) => a - b);
  expect(orders).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
});

test.each(Object.entries(DEF_TABLE))('%s def matches the design table', (id, row) => {
  const i = getIncident(id)!;
  expect(i.def.order).toBe(row.order);
  expect(i.def.stage).toBe(row.stage);
  expect(i.def.hiddenFailure).toBe(row.failure);
  expect(i.def.baseSuccess).toBeCloseTo(row.base);
  expect(i.def.capabilityEffects).toEqual(row.effects);
  expect(i.def.unlocks).toEqual(row.unlocks);
  expect(i.def.baseTokenCost).toBe(row.token);
  expect(i.def.trials).toBe(200);
});

function* iterLocalized(i: Incident): Generator<LocalizedText> {
  const c = i.content;
  yield c.title;
  yield c.failureName;
  yield c.explanation;
  yield c.patternName;
  yield c.patternSummary;
  for (const e of c.evidences) {
    yield e.title;
    yield e.content;
  }
  for (const h of c.hypotheses) {
    yield h.text;
    yield h.feedback;
  }
  for (const iv of c.interventions) {
    yield iv.name;
    yield iv.description;
    yield iv.configDiff;
    yield iv.tradeoff;
    for (const p of iv.parameters) yield p.label;
  }
  for (const s of c.xrayTimeline) {
    yield s.context.content;
    yield s.prompt.content;
    yield s.decision.content;
    if (s.observation) yield s.observation;
    for (const m of s.memory.shortTerm) yield m;
    for (const m of s.memory.longTerm) yield m;
    yield s.nextAction;
    for (const a of s.annotations) yield a.text;
  }
  for (const sys of i.def.incidentMeta.affectedSystems) yield sys;
  yield i.def.incidentMeta.alertSummary;
  yield i.def.incidentMeta.agentClaim;
}

test.each(LEVEL_IDS)('%s meets content minima and is fully localized', (id) => {
  const i = getIncident(id)!;
  expect(i.content.evidences.length).toBeGreaterThanOrEqual(5);
  expect(i.content.evidences.some((e) => e.isKeyEvidence)).toBe(true);
  expect(i.content.hypotheses.length).toBeGreaterThanOrEqual(3);
  expect(i.content.hypotheses.filter((h) => h.isCorrect)).toHaveLength(1);
  expect(i.content.interventions.length).toBeGreaterThanOrEqual(2);
  const optimals = i.content.interventions.filter((x) => x.isOptimal);
  expect(optimals.length).toBeGreaterThanOrEqual(1);
  for (const o of optimals) expect(o.grantsCapabilities.length).toBeGreaterThan(0);
  for (const s of i.content.interventions.filter((x) => !x.isOptimal)) {
    expect(s.grantsCapabilities).toEqual([]);
  }
  expect(i.content.xrayTimeline.length).toBeGreaterThanOrEqual(4);
  for (const t of iterLocalized(i)) {
    expect(t.en.trim().length, `${id} empty en text`).toBeGreaterThan(0);
    expect(t.zh.trim().length, `${id} empty zh text`).toBeGreaterThan(0);
  }
});

test('unlock chain: every optimal grant is unlocked by this or an earlier incident', () => {
  const sorted = [...INCIDENTS].sort((a, b) => a.def.order - b.def.order);
  for (const inc of sorted) {
    const available = new Set<CapabilityId>(inc.def.unlocks);
    for (const earlier of sorted) {
      if (earlier.def.order >= inc.def.order) break;
      for (const u of earlier.def.unlocks) available.add(u);
    }
    for (const iv of inc.content.interventions.filter((x) => x.isOptimal)) {
      for (const cap of iv.grantsCapabilities) {
        expect(available.has(cap), `${inc.def.id} grants ${cap} without unlock path`).toBe(true);
      }
    }
  }
});

test.each(LEVEL_IDS)('%s optimal path improves rate and can close', (id) => {
  const i = getIncident(id)!;
  const opt = i.content.interventions.filter((x) => x.isOptimal).map((x) => x.id);
  const selected = new Set(opt);
  const after = successRateWithInterventions(i.def, i.content.interventions, selected, {});
  expect(after).toBeGreaterThan(i.def.baseSuccess);
  expect(canCloseIncident(i.content.interventions, selected, true)).toBe(true);
});
