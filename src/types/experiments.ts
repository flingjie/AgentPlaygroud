import type { AgentEvent, ContextSnapshot, EnvironmentSnapshot } from './events';

// ── Learning Stages ─────────────────────────────────────────────────────────

export type LearningStage = 0 | 1 | 2 | 3;

// ── Expected Failure ────────────────────────────────────────────────────────

export interface ExpectedFailure {
  reason: string;
  rootCauseKey: string;
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
