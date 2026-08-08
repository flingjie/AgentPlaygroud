import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import IncidentMap, { isPlayable } from './IncidentMap';
import { I18nProvider } from '../i18n/I18nProvider';
import type { Incident, StageId } from '../content/schema';

const mockState = vi.hoisted(() => {
  const state = {
    completed: [] as string[],
    isCompleted: (id: string) => state.completed.includes(id),
    isUnlocked: () => false,
  };
  return state;
});

vi.mock('../state/progressStore', () => ({
  useProgress: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));

const baseIncident = (id: string, order: number, stage: StageId): Incident => ({
  def: {
    id,
    order,
    stage,
    hiddenFailure: 'hallucination',
    baseSuccess: 0.1,
    capabilityEffects: {},
    unlocks: [],
    baseTokenCost: 1000,
    trials: 200,
    incidentMeta: {
      severity: 'P1',
      affectedSystems: [],
      reportedAt: '2026-08-08T00:00:00Z',
      alertSummary: { en: 'A', zh: 'A' },
      agentClaim: { en: 'C', zh: 'C' },
    },
  },
  content: {
    title: { en: `Incident ${id}`, zh: `事故 ${id}` },
    failureName: { en: 'F', zh: 'F' },
    explanation: { en: 'E', zh: 'E' },
    patternName: { en: 'P', zh: 'P' },
    patternSummary: { en: 'S', zh: 'S' },
    evidences: [],
    hypotheses: [],
    interventions: [],
    xrayTimeline: [],
  },
});

function renderMap(incidents: Incident[]) {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <IncidentMap incidents={incidents} />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('IncidentMap', () => {
  beforeEach(() => {
    mockState.completed = [];
  });

  it('renders stage names and taglines for non-empty stages', () => {
    renderMap([baseIncident('inc-010', 10, 'loop')]);
    expect(screen.getByText('Loop 工程')).toBeDefined();
    expect(screen.getByText('让 Agent 可靠完成')).toBeDefined();
  });

  it('unlocks only the lowest-order incident when completed is empty', () => {
    renderMap([
      baseIncident('inc-010', 10, 'loop'),
      baseIncident('inc-011', 11, 'graph'),
    ]);
    expect(screen.getByRole('link', { name: /事故 inc-010/ })).toBeDefined();
    expect(screen.queryByRole('link', { name: /事故 inc-011/ })).toBeNull();
  });

  it('links each playable incident to its incident page', () => {
    renderMap([baseIncident('inc-010', 10, 'loop')]);
    expect(screen.getByRole('link').getAttribute('href')).toBe('/incident/inc-010');
  });

  it('shows completed incidents as completed and not as links', () => {
    mockState.completed = ['inc-010'];
    renderMap([baseIncident('inc-010', 10, 'loop')]);
    expect(screen.getByText(/已完成/)).toBeDefined();
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('isPlayable', () => {
  it('returns true when the progress store says the incident is unlocked', () => {
    const def = baseIncident('inc-010', 10, 'loop').def;
    expect(isPlayable(def, () => true, [])).toBe(true);
  });

  it('unlocks the lowest-order registered incident when nothing is unlocked', () => {
    const list = [
      baseIncident('inc-011', 11, 'graph'),
      baseIncident('inc-010', 10, 'loop'),
    ];
    expect(isPlayable(list[0].def, () => false, list)).toBe(false);
    expect(isPlayable(list[1].def, () => false, list)).toBe(true);
  });
});
