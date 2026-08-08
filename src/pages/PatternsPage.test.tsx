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

  it('renders the empty state when no scenarios are completed', () => {
    renderPatternsPage();
    expect(screen.getByText('完成实验以收集 Pattern。')).toBeDefined();
  });

  it('renders a PatternCard for each completed scenario', () => {
    useProgress.setState({
      completed: ['scenario-001'],
      inventory: ['context-injection', 'tool-registry'],
    });
    renderPatternsPage();
    expect(screen.getByTestId('pattern-card')).toBeDefined();
    expect(screen.getByText('Grounding（上下文 + 工具）')).toBeDefined();
  });
});
