import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { I18nProvider } from '../../i18n/I18nProvider';
import { getIncident } from '../../content/incidents';
import { useProgress } from '../../state/progressStore';
import { useInvestigation } from '../../state/investigationStore';
import { IncidentShell } from './IncidentShell';

const renderWithI18n = (ui: React.ReactNode) => render(<I18nProvider>{ui}</I18nProvider>);

describe('IncidentShell with INC-010', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgress.setState({ completed: [], inventory: [] });
    useInvestigation.setState({ viewedEvidenceIds: [] });
  });

  it('completes the four-act loop: correct hypothesis → optimal intervention → verify → close enabled', () => {
    const incident = getIncident('inc-010')!;
    renderWithI18n(<IncidentShell incident={incident} />);

    // Scene phase
    expect(screen.getByTestId('start-diagnosis')).toBeDefined();
    fireEvent.click(screen.getByTestId('start-diagnosis'));

    // Diagnose phase
    const correctOption = screen.getByTestId('hypothesis-option-h-010-correct');
    fireEvent.click(correctOption.querySelector('input')!);
    fireEvent.click(screen.getByTestId('confirm-diagnosis'));

    // Intervene phase
    const optimalCard = screen.getByTestId('intervention-card-int-010-evidence-loop');
    fireEvent.click(optimalCard.querySelector('input')!);
    fireEvent.click(screen.getByTestId('go-verify'));

    // Verify phase
    expect(screen.getByTestId('close-incident')).toBeDefined();
    expect((screen.getByTestId('close-incident') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId('verify-button'));

    // After verify, close should be enabled because optimal intervention is selected
    expect((screen.getByTestId('close-incident') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByTestId('close-incident'));

    // Closed phase
    expect(useProgress.getState().isCompleted('inc-010')).toBe(true);
  });

  it('advances with a wrong hypothesis and shows the feedback banner', () => {
    const incident = getIncident('inc-010')!;
    renderWithI18n(<IncidentShell incident={incident} />);

    fireEvent.click(screen.getByTestId('start-diagnosis'));

    const wrongOption = screen.getByTestId('hypothesis-option-h-010-temperature');
    fireEvent.click(wrongOption.querySelector('input')!);
    fireEvent.click(screen.getByTestId('confirm-diagnosis'));

    expect(screen.getByTestId('wrong-hypothesis-banner')).toBeDefined();
  });

  it('records viewed evidence when evidence cards are opened', () => {
    const incident = getIncident('inc-010')!;
    renderWithI18n(<IncidentShell incident={incident} />);

    const card = screen.getByTestId('evidence-card-ev-010-terminal');
    fireEvent.click(card);

    expect(useInvestigation.getState().viewedEvidenceIds).toContain('ev-010-terminal');
  });
});
