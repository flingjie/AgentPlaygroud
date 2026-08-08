import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ExperimentShell } from './ExperimentShell';
import { I18nProvider } from '../i18n/I18nProvider';
import { useProgress } from '../state/progressStore';
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
    title: { en: 'S001', zh: 'S001' },
    mission: { en: 'Run the agent and reveal its hidden failure.', zh: '运行 Agent 并揭示其隐藏故障。' },
    failureName: { en: 'Hallucination', zh: '幻觉' },
    failureNarrative: { en: 'The agent answered without reading the code.', zh: 'Agent 未读代码就给出了答案。' },
    missingCapabilityHint: { en: 'Context injection is missing.', zh: '缺少上下文注入。' },
    explanation: { en: 'Why it works', zh: '设计原理' },
    patternName: { en: 'Context Injection', zh: '上下文注入' },
    patternSummary: { en: 'Feed real context to the model.', zh: '把真实上下文喂给模型。' },
  },
};

function renderShell() {
  return render(
    <I18nProvider>
      <ExperimentShell scenario={scenario} />
    </I18nProvider>,
  );
}

describe('ExperimentShell', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgress.setState({ completed: [], inventory: ['context-injection', 'tool-registry'] });
  });

  it('renders the mission text', () => {
    renderShell();
    expect(screen.getByTestId('mission')).toBeDefined();
  });

  it('reveals the failure panel after running the baseline experiment', () => {
    renderShell();
    fireEvent.click(screen.getByTestId('run-button'));
    expect(screen.getByTestId('failure-panel')).toBeDefined();
    expect(screen.getByTestId('missing-capability-hint').textContent).not.toBe('');
  });

  it('lists the required capabilities in the capability panel', () => {
    renderShell();
    expect(screen.getByTestId('capability-toggle-context-injection')).toBeDefined();
    expect(screen.getByTestId('capability-toggle-tool-registry')).toBeDefined();
  });

  it('enables the complete button after injecting all required capabilities and re-running', () => {
    renderShell();
    fireEvent.click(screen.getByTestId('run-button'));

    const completeButton = screen.getByTestId('complete-button') as HTMLButtonElement;
    expect(completeButton.disabled).toBe(true);

    fireEvent.click(screen.getByTestId('capability-toggle-context-injection'));
    fireEvent.click(screen.getByTestId('capability-toggle-tool-registry'));
    fireEvent.click(screen.getByTestId('run-button'));

    expect(completeButton.disabled).toBe(false);
  });

  it('does not leak state across scenario navigation (different keys)', () => {
    const { rerender } = render(
      <I18nProvider>
        <ExperimentShell key={scenario.def.id} scenario={scenario} />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByTestId('run-button'));
    expect(screen.getByTestId('failure-panel')).toBeDefined();

    const scenarioB = { ...scenario, def: { ...scenario.def, id: 'scenario-b' } };
    rerender(
      <I18nProvider>
        <ExperimentShell key={scenarioB.def.id} scenario={scenarioB} />
      </I18nProvider>,
    );
    expect(screen.getByTestId('run-button')).toBeDefined();
    expect(screen.queryByTestId('failure-panel')).toBeNull();
  });
});
