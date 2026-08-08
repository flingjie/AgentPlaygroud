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
});
