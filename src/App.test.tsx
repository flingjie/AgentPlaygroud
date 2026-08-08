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
    expect(screen.getByText('Agent 事故模拟实验室')).toBeDefined();
    expect(screen.getByText('Loop 工程')).toBeDefined();
  });

  it('switches to English and shows English stage name', () => {
    renderApp();
    act(() => {
      screen.getByTestId('switch-en').click();
    });
    expect(screen.getByText('Loop Engineering')).toBeDefined();
  });

  it('renders the lowest-order incident as a playable map item', () => {
    renderApp();
    expect(screen.getByText(/INC-000/)).toBeDefined();
    const link = screen.getByRole('link', { name: /INC-000/ });
    expect(link.getAttribute('href')).toBe('#/incident/inc-000');
  });

  it('marks a completed incident and keeps later ones locked until predecessors finish', () => {
    useProgress.setState({
      completed: ['inc-000'],
      inventory: ['context-injection', 'tool-registry'],
    });
    renderApp();
    expect(screen.getByText(/已完成/)).toBeDefined();
    expect(screen.queryByRole('link', { name: /INC-000/ })).toBeNull();
    expect(screen.getByRole('link', { name: /INC-001/ })).toBeDefined();
  });
});
