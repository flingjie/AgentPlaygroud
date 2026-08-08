import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { I18nProvider, useLocale } from './i18n/I18nProvider';
import { ThemeProvider } from './theme/ThemeProvider';
import { useProgress } from './state/progressStore';
import App from './App';

function TestWrapper() {
  const { setLocale } = useLocale();
  return (
    <div>
      <button type="button" onClick={() => setLocale('en')} data-testid="switch-en">
        switch-en
      </button>
      <App />
    </div>
  );
}

function renderApp() {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <TestWrapper />
      </ThemeProvider>
    </I18nProvider>,
  );
}

describe('App shell', () => {
  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    useProgress.setState({ completed: [], inventory: [] });
  });

  it('renders home page in Chinese by default', () => {
    renderApp();
    expect(screen.getByText('Harness 工程')).toBeDefined();
  });

  it('switches to English and shows English stage name', () => {
    renderApp();
    act(() => {
      screen.getByTestId('switch-en').click();
    });
    expect(screen.getByText('Harness Engineering')).toBeDefined();
  });

  it('unlocks the next scenario after the first is completed', () => {
    useProgress.setState({
      completed: ['scenario-001'],
      inventory: ['context-injection', 'tool-registry'],
    });
    renderApp();
    expect(screen.getByRole('link', { name: '工具故障' })).toBeDefined();
    expect(screen.getByText('非安全执行')).toBeDefined();
  });

  it('shows visible unlock hint on locked scenarios', () => {
    renderApp();
    const hints = screen.getAllByTestId('unlock-hint');
    expect(hints.length).toBeGreaterThan(0);
    hints.forEach((hint) => {
      expect(hint.textContent?.trim().length).toBeGreaterThan(0);
    });
  });

  it('renders the updated app title and temporary INC-010 home banner', () => {
    renderApp();
    expect(screen.getByText('Agent 事故模拟实验室')).toBeDefined();
    expect(screen.getByText('INC-010 虚假完成：从未运行的 Auth 修复')).toBeDefined();
    expect(screen.getByRole('link', { name: /开始诊断/ })).toBeDefined();
  });
});
