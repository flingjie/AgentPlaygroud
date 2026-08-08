import type { IncidentDef } from '../content/schema';
import type { TrialResult } from './simulator';
import { buildTimeline } from './events';

const inc000: IncidentDef = {
  id: 'inc-000', order: 0, stage: 'llm', hiddenFailure: 'hallucination',
  baseSuccess: 0.08,
  capabilityEffects: { 'context-injection': 0.22, 'tool-registry': 0.05 },
  unlocks: ['context-injection', 'tool-registry'],
  baseTokenCost: 1800, trials: 200,
  incidentMeta: {
    severity: 'P2',
    affectedSystems: [{ en: 'svc', zh: 'svc' }],
    reportedAt: '2026-07-02T09:14:00Z',
    alertSummary: { en: 'a', zh: 'a' },
    agentClaim: { en: 'a', zh: 'a' },
  },
};

// (a) 时间线以 trigger 开始、verdict 结束
test('timeline starts with trigger and ends with verdict', () => {
  const enabled = new Set(['context-injection', 'tool-registry'] as const);
  const result: TrialResult = { success: true, failure: null, tokenCost: 2000, steps: 5, seed: 1 };
  const timeline = buildTimeline(inc000, result, enabled);
  expect(timeline[0].kind).toBe('trigger');
  expect(timeline[timeline.length - 1].kind).toBe('verdict');
});

// (b) 失败试验必含一个 kind:'failure' 且其 step < verdict.step
test('failed trial contains a failure event before verdict', () => {
  const enabled = new Set<never>();
  const result: TrialResult = { success: false, failure: 'hallucination', tokenCost: 2000, steps: 5, seed: 1 };
  const timeline = buildTimeline(inc000, result, enabled);
  const failure = timeline.find(e => e.kind === 'failure');
  expect(failure).toBeDefined();
  const verdict = timeline.find(e => e.kind === 'verdict');
  expect(failure!.step).toBeLessThan(verdict!.step);
});

// (c) 启用所有 effect 能力且成功时含 kind:'mitigation'
test('successful trial with all capability effects enabled contains mitigation', () => {
  const enabled = new Set(['context-injection', 'tool-registry'] as const);
  const result: TrialResult = { success: true, failure: null, tokenCost: 2000, steps: 5, seed: 1 };
  const timeline = buildTimeline(inc000, result, enabled);
  expect(timeline.some(e => e.kind === 'mitigation')).toBe(true);
});

// (d) 事件 step 严格递增
test('event steps strictly increase', () => {
  const enabled = new Set<never>();
  const result: TrialResult = { success: false, failure: 'hallucination', tokenCost: 2000, steps: 5, seed: 1 };
  const timeline = buildTimeline(inc000, result, enabled);
  for (let i = 1; i < timeline.length; i++) {
    expect(timeline[i].step).toBeGreaterThan(timeline[i - 1].step);
  }
});

// (e) 每个事件 text 同时有 en/zh
test('every event has bilingual text', () => {
  const enabled = new Set<never>();
  const result: TrialResult = { success: false, failure: 'hallucination', tokenCost: 2000, steps: 5, seed: 1 };
  const timeline = buildTimeline(inc000, result, enabled);
  for (const event of timeline) {
    expect(event.text.en).toBeTruthy();
    expect(event.text.zh).toBeTruthy();
  }
});
