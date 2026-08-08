import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { SuccessGauge } from './SuccessGauge';
import { I18nProvider } from '../i18n/I18nProvider';

describe('SuccessGauge', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders rounded percentage text', () => {
    render(
      <I18nProvider>
        <SuccessGauge value={0.345} label="Success" />
      </I18nProvider>,
    );
    expect(screen.getByText('35%')).toBeDefined();
    expect(screen.getByText('Success')).toBeDefined();
  });

  it('clamps out-of-range and non-finite values', () => {
    const { rerender } = render(
      <I18nProvider>
        <SuccessGauge value={1.4} label="High" />
      </I18nProvider>,
    );
    expect(screen.getByText('100%')).toBeDefined();

    rerender(
      <I18nProvider>
        <SuccessGauge value={-0.2} label="Low" />
      </I18nProvider>,
    );
    expect(screen.getByText('0%')).toBeDefined();

    rerender(
      <I18nProvider>
        <SuccessGauge value={NaN} label="Invalid" />
      </I18nProvider>,
    );
    expect(screen.getByText('0%')).toBeDefined();
  });
});
