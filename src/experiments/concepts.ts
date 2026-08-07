import type { LearningConcept } from '../types/experiments';

export const LEARNING_CONCEPTS: LearningConcept[] = [
  // ── Stage 0: Model Engineering ──────────────────────────────────────────
  {
    id: 'token-generation',
    stage: 0,
    titleKey: 'concepts.tokenGeneration',
    descriptionKey: 'concepts.tokenGenerationDesc',
    prerequisites: [],
  },
  {
    id: 'probability-distribution',
    stage: 0,
    titleKey: 'concepts.probabilityDistribution',
    descriptionKey: 'concepts.probabilityDistributionDesc',
    prerequisites: ['token-generation'],
  },
  {
    id: 'hallucination',
    stage: 0,
    titleKey: 'concepts.hallucination',
    descriptionKey: 'concepts.hallucinationDesc',
    prerequisites: ['token-generation'],
  },
  {
    id: 'knowledge-cutoff',
    stage: 0,
    titleKey: 'concepts.knowledgeCutoff',
    descriptionKey: 'concepts.knowledgeCutoffDesc',
    prerequisites: ['hallucination'],
  },
  {
    id: 'context-window',
    stage: 0,
    titleKey: 'concepts.contextWindow',
    descriptionKey: 'concepts.contextWindowDesc',
    prerequisites: ['token-generation'],
  },
  {
    id: 'attention',
    stage: 0,
    titleKey: 'concepts.attention',
    descriptionKey: 'concepts.attentionDesc',
    prerequisites: ['context-window'],
  },
  {
    id: 'temperature',
    stage: 0,
    titleKey: 'concepts.temperature',
    descriptionKey: 'concepts.temperatureDesc',
    prerequisites: ['probability-distribution'],
  },
  {
    id: 'sampling',
    stage: 0,
    titleKey: 'concepts.sampling',
    descriptionKey: 'concepts.samplingDesc',
    prerequisites: ['temperature'],
  },
  {
    id: 'determinism',
    stage: 0,
    titleKey: 'concepts.determinism',
    descriptionKey: 'concepts.determinismDesc',
    prerequisites: ['temperature'],
  },

  // ── Stage 1: Harness Engineering ────────────────────────────────────────
  {
    id: 'tool-contract',
    stage: 1,
    titleKey: 'concepts.toolContract',
    descriptionKey: 'concepts.toolContractDesc',
    prerequisites: ['hallucination'],
  },
  {
    id: 'retry-mechanism',
    stage: 1,
    titleKey: 'concepts.retryMechanism',
    descriptionKey: 'concepts.retryMechanismDesc',
    prerequisites: ['tool-contract'],
  },
  {
    id: 'execution-isolation',
    stage: 1,
    titleKey: 'concepts.executionIsolation',
    descriptionKey: 'concepts.executionIsolationDesc',
    prerequisites: ['tool-contract'],
  },
  {
    id: 'capability-vs-permission',
    stage: 1,
    titleKey: 'concepts.capabilityVsPermission',
    descriptionKey: 'concepts.capabilityVsPermissionDesc',
    prerequisites: ['tool-contract'],
  },
  {
    id: 'versioning',
    stage: 1,
    titleKey: 'concepts.versioning',
    descriptionKey: 'concepts.versioningDesc',
    prerequisites: ['tool-contract'],
  },
  {
    id: 'freshness',
    stage: 1,
    titleKey: 'concepts.freshness',
    descriptionKey: 'concepts.freshnessDesc',
    prerequisites: ['context-window'],
  },
  {
    id: 'context-limits',
    stage: 1,
    titleKey: 'concepts.contextLimits',
    descriptionKey: 'concepts.contextLimitsDesc',
    prerequisites: ['context-window'],
  },

  // ── Stage 2: Loop Engineering ───────────────────────────────────────────
  {
    id: 'evidence-based-stop',
    stage: 2,
    titleKey: 'concepts.evidenceBasedStop',
    descriptionKey: 'concepts.evidenceBasedStopDesc',
    prerequisites: ['versioning'],
  },
  {
    id: 'state-policy',
    stage: 2,
    titleKey: 'concepts.statePolicy',
    descriptionKey: 'concepts.statePolicyDesc',
    prerequisites: ['context-limits'],
  },
  {
    id: 'loop-necessity',
    stage: 2,
    titleKey: 'concepts.loopNecessity',
    descriptionKey: 'concepts.loopNecessityDesc',
    prerequisites: ['retry-mechanism'],
  },
  {
    id: 'verification-loop',
    stage: 2,
    titleKey: 'concepts.verificationLoop',
    descriptionKey: 'concepts.verificationLoopDesc',
    prerequisites: ['evidence-based-stop'],
  },
  {
    id: 'boundary-guard',
    stage: 2,
    titleKey: 'concepts.boundaryGuard',
    descriptionKey: 'concepts.boundaryGuardDesc',
    prerequisites: ['loop-necessity'],
  },
  {
    id: 'recovery-path',
    stage: 2,
    titleKey: 'concepts.recoveryPath',
    descriptionKey: 'concepts.recoveryPathDesc',
    prerequisites: ['loop-necessity'],
  },

  // ── Stage 3: Graph Engineering ──────────────────────────────────────────
  {
    id: 'topology-basics',
    stage: 3,
    titleKey: 'concepts.topologyBasics',
    descriptionKey: 'concepts.topologyBasicsDesc',
    prerequisites: ['loop-necessity'],
  },
  {
    id: 'parallelism',
    stage: 3,
    titleKey: 'concepts.parallelism',
    descriptionKey: 'concepts.parallelismDesc',
    prerequisites: ['topology-basics'],
  },
  {
    id: 'feedback-edges',
    stage: 3,
    titleKey: 'concepts.feedbackEdges',
    descriptionKey: 'concepts.feedbackEdgesDesc',
    prerequisites: ['topology-basics', 'verification-loop'],
  },
  {
    id: 'recovery-design',
    stage: 3,
    titleKey: 'concepts.recoveryDesign',
    descriptionKey: 'concepts.recoveryDesignDesc',
    prerequisites: ['recovery-path', 'topology-basics'],
  },
];

export function conceptsByStage(stage: number): LearningConcept[] {
  return LEARNING_CONCEPTS.filter((c) => c.stage === stage);
}

export function conceptById(id: string): LearningConcept | undefined {
  return LEARNING_CONCEPTS.find((c) => c.id === id);
}
