import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PatternCard } from './PatternCard';
import { I18nProvider } from '../i18n/I18nProvider';
import type { Scenario } from '../content/schema';

const scenario: Scenario = {
  def: {
    id: 'scenario-001',
    order: 1,
    stage: 'harness',
    hiddenFailure: 'hallucination',
    baseSuccess: 0.08,
    capabilityEffects: { 'context-injection': 0.22, 'tool-registry': 0.05 },
    requiredCapabilities: ['context-injection', 'tool-registry'],
    unlocks: ['context-injection', 'tool-registry'],
    baseTokenCost: 1800,
    trials: 200,
  },
  content: {
    title: { en: 'Fix the bug', zh: '修复 bug' },
    mission: { en: 'Fix the bug', zh: '修复 bug' },
    failureName: { en: 'HALLUCINATION', zh: '幻觉' },
    failureNarrative: { en: 'Narrative', zh: '叙事' },
    missingCapabilityHint: { en: 'Hint', zh: '提示' },
    explanation: { en: 'Explanation', zh: '解释' },
    patternName: { en: 'Context Injection Pattern', zh: '上下文注入模式' },
    patternSummary: { en: 'Summary', zh: '摘要' },
  },
};

describe('PatternCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows pattern name in zh by default', () => {
    render(
      <I18nProvider>
        <PatternCard scenario={scenario} />
      </I18nProvider>,
    );
    expect(screen.getByText('上下文注入模式')).toBeDefined();
  });
});
