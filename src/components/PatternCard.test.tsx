import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PatternCard } from './PatternCard';
import { I18nProvider } from '../i18n/I18nProvider';
import type { Incident } from '../content/schema';

const incident: Incident = {
  def: {
    id: 'inc-000',
    order: 0,
    stage: 'llm',
    hiddenFailure: 'hallucination',
    baseSuccess: 0.08,
    capabilityEffects: { 'context-injection': 0.22, 'tool-registry': 0.05 },
    unlocks: ['context-injection', 'tool-registry'],
    baseTokenCost: 1800,
    trials: 200,
    incidentMeta: {
      severity: 'P2',
      affectedSystems: [{ en: 'svc', zh: 'svc' }],
      reportedAt: '2026-07-02T09:14:00Z',
      alertSummary: { en: 'a', zh: 'a' },
      agentClaim: { en: 'a', zh: 'a' },
    },
  },
  content: {
    title: { en: 'Fix the bug', zh: '修复 bug' },
    failureName: { en: 'HALLUCINATION', zh: '幻觉' },
    explanation: { en: 'Explanation', zh: '解释' },
    patternName: { en: 'Context Injection Pattern', zh: '上下文注入模式' },
    patternSummary: { en: 'Summary', zh: '摘要' },
    evidences: [],
    hypotheses: [],
    interventions: [],
    xrayTimeline: [],
  },
};

describe('PatternCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows pattern name in zh by default', () => {
    render(
      <I18nProvider>
        <PatternCard incident={incident} />
      </I18nProvider>,
    );
    expect(screen.getByText('上下文注入模式')).toBeDefined();
  });
});
