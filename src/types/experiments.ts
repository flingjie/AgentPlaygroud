import type { AgentEvent, ContextSnapshot, EnvironmentSnapshot, Trace, TraceMonteCarloResult } from './events';

// ── Learning Stages ─────────────────────────────────────────────────────────

export type LearningStage = 0 | 1 | 2 | 3;

export const STAGE_LABELS: Record<LearningStage, string> = {
  0: 'Model Engineering',
  1: 'Harness Engineering',
  2: 'Loop Engineering',
  3: 'Graph Engineering',
};

export interface LearningConcept {
  id: string;
  stage: LearningStage;
  titleKey: string;
  descriptionKey: string;
  prerequisites: string[];
}

// ── Expected Failure ────────────────────────────────────────────────────────

export interface ExpectedFailure {
  reason: string; // FailureReason value
  rootCauseKey: string; // i18n key
  missingCapabilityKey: string;
  recommendedFixKey: string;
}

// ── Experiment Configuration ────────────────────────────────────────────────

export interface ExperimentConfig {
  id: string;
  stage: LearningStage;
  titleKey: string;
  descriptionKey: string;
  learningConcepts: string[]; // LearningConcept.id references
  runtimeTrace: {
    events: Partial<AgentEvent>[]; // event sequence template
    contextTemplate: Partial<ContextSnapshot>;
    environmentTemplate: Partial<EnvironmentSnapshot>;
  };
  expectedFailure: ExpectedFailure | null; // null = demonstration (no failure expected)
  harnessConfig: {
    availableDims: string[];
  };
}

// ── Experiment Result ───────────────────────────────────────────────────────

export interface ExperimentResult {
  experimentId: string;
  trace: Trace | null;
  monteCarlo: TraceMonteCarloResult | null;
  completedAt: number | null;
}
