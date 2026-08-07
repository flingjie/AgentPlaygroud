import type { ExperimentConfig, LearningConcept, ExperimentResult } from '../types/experiments';
import type { Trace } from '../types/events';

// ── Experiment selectors ────────────────────────────────────────────────────

export function getExperimentsByStage(
  experiments: ExperimentConfig[],
  stage: number,
): ExperimentConfig[] {
  return experiments.filter((e) => e.stage === stage);
}

export function getExperimentById(
  experiments: ExperimentConfig[],
  id: string | null,
): ExperimentConfig | undefined {
  if (!id) return undefined;
  return experiments.find((e) => e.id === id);
}

export function getConceptsForExperiment(
  concepts: LearningConcept[],
  experiment: ExperimentConfig,
): LearningConcept[] {
  return concepts.filter((c) => experiment.learningConcepts.includes(c.id));
}

// ── Trace selectors ─────────────────────────────────────────────────────────

export function getEventsByType(
  trace: Trace | null,
  type: string,
) {
  if (!trace) return [];
  return trace.events.filter((e) => e.type === type);
}

export function getFailureEvents(trace: Trace | null) {
  if (!trace) return [];
  return trace.events.filter(
    (e) => e.type === 'VERIFY' && e.payload.passed === false,
  );
}

export function getLoopIterations(trace: Trace | null): number {
  if (!trace) return 0;
  return trace.events.filter((e) => e.type === 'LOOP_STOP').length;
}

// ── Result selectors ────────────────────────────────────────────────────────

export function getResultForExperiment(
  results: Map<string, ExperimentResult>,
  experimentId: string | null,
): ExperimentResult | undefined {
  if (!experimentId) return undefined;
  return results.get(experimentId);
}
