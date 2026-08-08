import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { useProgress } from '../state/progressStore';
import PatternsPage from './PatternsPage';

function renderPatternsPage() {
  return render(
    <I18nProvider>
      <PatternsPage />
    </I18nProvider>,
  );
}

describe('PatternsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgress.setState({ completed: [], inventory: [] });
  });

  it('renders the empty state when no incidents are completed', () => {
    renderPatternsPage();
    expect(screen.getByText('关闭事故以收集 Pattern。')).toBeDefined();
  });

  it('renders a PatternCard for each completed incident', () => {
    useProgress.setState({
      completed: ['inc-000'],
      inventory: ['context-injection', 'tool-registry'],
    });
    renderPatternsPage();
    expect(screen.getByTestId('pattern-card')).toBeDefined();
    expect(screen.getByText('Grounding（落地）：上下文注入 + 工具注册表')).toBeDefined();
  });
});
