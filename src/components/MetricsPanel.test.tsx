import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsPanel } from './MetricsPanel';
import { I18nProvider } from '../i18n/I18nProvider';
import type { MonteCarloSummary } from '../engine/simulator';

const baseline: MonteCarloSummary = {
  trials: 200,
  successes: 16,
  successRate: 0.08,
  avgTokenCost: 1800,
  failureBreakdown: {},
};

const current: MonteCarloSummary = {
  trials: 200,
  successes: 70,
  successRate: 0.35,
  avgTokenCost: 2100,
  failureBreakdown: { hallucination: 130 },
};

describe('MetricsPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders breakdown bar labels', () => {
    render(
      <I18nProvider>
        <MetricsPanel baseline={baseline} current={current} />
      </I18nProvider>,
    );
    expect(screen.getByText('hallucination')).toBeDefined();
    expect(screen.getByText('130')).toBeDefined();
  });

  it('renders safely when trials is zero', () => {
    const zeroTrials: MonteCarloSummary = {
      trials: 0,
      successes: 0,
      successRate: 0,
      avgTokenCost: 0,
      failureBreakdown: {},
    };
    const { container } = render(
      <I18nProvider>
        <MetricsPanel baseline={null} current={zeroTrials} />
      </I18nProvider>,
    );
    expect(container.textContent).not.toContain('Infinity');
    expect(container.innerHTML).not.toContain('Infinity');
  });
});
