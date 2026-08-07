import type { ExperimentConfig } from '../types/experiments';

// ── Stage 0: Model Engineering ──────────────────────────────────────────────

const stage0Experiments: ExperimentConfig[] = [
  {
    id: '001-next-token',
    stage: 0,
    titleKey: 'exp.001NextToken.title',
    descriptionKey: 'exp.001NextToken.desc',
    learningConcepts: ['token-generation', 'probability-distribution'],
    runtimeTrace: {
      events: [],
      contextTemplate: { systemPrompt: '', tokenCount: 0, tokenLimit: 8000 },
      environmentTemplate: {},
    },
    expectedFailure: null,
    harnessConfig: { availableDims: [] },
  },
  {
    id: '002-knowledge-boundary',
    stage: 0,
    titleKey: 'exp.002KnowledgeBoundary.title',
    descriptionKey: 'exp.002KnowledgeBoundary.desc',
    learningConcepts: ['hallucination', 'knowledge-cutoff'],
    runtimeTrace: {
      events: [],
      contextTemplate: { systemPrompt: '', tokenCount: 0, tokenLimit: 8000 },
      environmentTemplate: {},
    },
    expectedFailure: {
      reason: 'HALLUCINATION',
      rootCauseKey: 'diagnosis.002.rootCause',
      missingCapabilityKey: 'diagnosis.002.missingCapability',
      recommendedFixKey: 'diagnosis.002.recommendedFix',
    },
    harnessConfig: { availableDims: [] },
  },
  {
    id: '003-context-dependency',
    stage: 0,
    titleKey: 'exp.003ContextDependency.title',
    descriptionKey: 'exp.003ContextDependency.desc',
    learningConcepts: ['context-window', 'attention'],
    runtimeTrace: {
      events: [],
      contextTemplate: { systemPrompt: '', tokenCount: 0, tokenLimit: 8000 },
      environmentTemplate: {},
    },
    expectedFailure: null,
    harnessConfig: { availableDims: [] },
  },
  {
    id: '004-non-determinism',
    stage: 0,
    titleKey: 'exp.004NonDeterminism.title',
    descriptionKey: 'exp.004NonDeterminism.desc',
    learningConcepts: ['temperature', 'sampling', 'determinism'],
    runtimeTrace: {
      events: [],
      contextTemplate: { systemPrompt: '', tokenCount: 0, tokenLimit: 8000 },
      environmentTemplate: {},
    },
    expectedFailure: null,
    harnessConfig: { availableDims: [] },
  },
];

// ── Registry ─────────────────────────────────────────────────────────────────

export const ALL_EXPERIMENTS: ExperimentConfig[] = [
  ...stage0Experiments,
];

export function experimentsByStage(stage: number): ExperimentConfig[] {
  return ALL_EXPERIMENTS.filter((e) => e.stage === stage);
}

export function experimentById(id: string): ExperimentConfig | undefined {
  return ALL_EXPERIMENTS.find((e) => e.id === id);
}

export function getStageCount(): number {
  const stages = new Set(ALL_EXPERIMENTS.map((e) => e.stage));
  return stages.size;
}
