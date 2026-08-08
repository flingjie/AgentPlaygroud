import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { HypothesisPanel } from './HypothesisPanel';
import type { Hypothesis } from '../../content/schema';

const hypotheses: Hypothesis[] = [
  {
    id: 'h-1',
    text: { en: 'Correct root cause', zh: '正确根因' },
    isCorrect: true,
    feedback: { en: 'Yes', zh: '是' },
  },
  {
    id: 'h-2',
    text: { en: 'Wrong root cause', zh: '错误根因' },
    isCorrect: false,
    feedback: { en: 'No', zh: '否' },
  },
];

const renderWithI18n = (ui: React.ReactNode) => render(<I18nProvider>{ui}</I18nProvider>);

describe('HypothesisPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders options and disables confirm initially', () => {
    renderWithI18n(
      <HypothesisPanel
        hypotheses={hypotheses}
        selectedId={null}
        confirmed={false}
        onSelect={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText('正确根因')).toBeDefined();
    expect(screen.getByText('错误根因')).toBeDefined();
    expect((screen.getByTestId('confirm-diagnosis') as HTMLButtonElement).disabled).toBe(true);
  });

  it('selects wrong hypothesis and shows feedback', () => {
    const onSelect = vi.fn();
    renderWithI18n(
      <HypothesisPanel
        hypotheses={hypotheses}
        selectedId={null}
        confirmed={false}
        onSelect={onSelect}
        onConfirm={() => {}}
      />,
    );
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[1]);
    expect(onSelect).toHaveBeenCalledWith('h-2');
  });

  it('shows feedback when selectedId is set', () => {
    renderWithI18n(
      <HypothesisPanel
        hypotheses={hypotheses}
        selectedId="h-2"
        confirmed={false}
        onSelect={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText('否')).toBeDefined();
  });

  it('confirm is enabled and locks selection after confirmed', () => {
    const onConfirm = vi.fn();
    renderWithI18n(
      <HypothesisPanel
        hypotheses={hypotheses}
        selectedId="h-2"
        confirmed={false}
        onSelect={() => {}}
        onConfirm={onConfirm}
      />,
    );
    const button = screen.getByTestId('confirm-diagnosis') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('locks inputs when confirmed', () => {
    renderWithI18n(
      <HypothesisPanel
        hypotheses={hypotheses}
        selectedId="h-2"
        confirmed={true}
        onSelect={() => {}}
        onConfirm={() => {}}
      />,
    );
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios[0].disabled).toBe(true);
    expect(radios[1].disabled).toBe(true);
    expect((screen.getByTestId('confirm-diagnosis') as HTMLButtonElement).disabled).toBe(true);
  });
});
