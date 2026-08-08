import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nProvider, useLocale, usePick } from './I18nProvider';
import { ui } from './uiStrings';

function TestHarness() {
  const { locale, setLocale } = useLocale();
  const pick = usePick();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="runBaseline">{pick(ui.runBaseline)}</span>
      <span data-testid="picked">{pick({ en: 'a', zh: 'b' })}</span>
      <button onClick={() => setLocale('en')}>switch-en</button>
    </div>
  );
}

describe('I18nProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults locale to zh', () => {
    render(
      <I18nProvider>
        <TestHarness />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('zh');
    expect(screen.getByTestId('runBaseline').textContent).toBe('运行基线实验');
    expect(screen.getByTestId('picked').textContent).toBe('b');
  });

  it('switches to en and updates pick results', () => {
    render(
      <I18nProvider>
        <TestHarness />
      </I18nProvider>,
    );
    act(() => {
      screen.getByText('switch-en').click();
    });
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(screen.getByTestId('runBaseline').textContent).toBe('Run Baseline Experiment');
    expect(screen.getByTestId('picked').textContent).toBe('a');
  });
});
