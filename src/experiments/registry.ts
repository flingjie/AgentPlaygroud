import type { ExperimentConfig } from '../types/experiments';

// ── Stage 0: Model Engineering ──────────────────────────────────────────────

const stage0Experiments = [
  // ==========================================================================
  // 001 — Next Token Prediction
  // ==========================================================================
  {
    id: '001-next-token',
    stage: 0 as const,
    titleKey: 'exp.001NextToken.title',
    descriptionKey: 'exp.001NextToken.desc',
    learningConcepts: ['token-generation', 'probability-distribution'],
    runtimeTrace: {
      events: [
        // Step 1: Build context from the input prompt
        {
          type: 'CONTEXT_BUILD',
          payload: {
            systemPrompt:
              'You are a helpful assistant. Answer questions accurately and concisely.',
            memoryCount: 1,
            toolCount: 0,
            tokenCount: 18,
          },
        },
        // Step 2: Model begins generating token-by-token
        // Token 1: "The"
        {
          type: 'MODEL_CALL',
          payload: {
            prompt: 'What is the capital of France?',
            tokensUsed: 22,
            modelId: 'claude-sim',
            temperature: 0,
            token: 'The',
            probability: 0.92,
            candidates: [
              { token: 'The', probability: 0.92 },
              { token: 'Paris', probability: 0.04 },
              { token: 'France', probability: 0.02 },
              { token: 'It', probability: 0.02 },
            ],
          },
        },
        // Token 2: " capital"
        {
          type: 'MODEL_CALL',
          payload: {
            prompt: 'What is the capital of France?',
            tokensUsed: 23,
            modelId: 'claude-sim',
            temperature: 0,
            token: ' capital',
            probability: 0.97,
            candidates: [
              { token: ' capital', probability: 0.97 },
              { token: ' answer', probability: 0.02 },
              { token: ' city', probability: 0.01 },
            ],
          },
        },
        // Token 3: " of"
        {
          type: 'MODEL_CALL',
          payload: {
            prompt: 'What is the capital of France?',
            tokensUsed: 24,
            modelId: 'claude-sim',
            temperature: 0,
            token: ' of',
            probability: 0.99,
            candidates: [
              { token: ' of', probability: 0.99 },
              { token: ' city', probability: 0.01 },
            ],
          },
        },
        // Token 4: " France"
        {
          type: 'MODEL_CALL',
          payload: {
            prompt: 'What is the capital of France?',
            tokensUsed: 25,
            modelId: 'claude-sim',
            temperature: 0,
            token: ' France',
            probability: 0.95,
            candidates: [
              { token: ' France', probability: 0.95 },
              { token: ' Paris', probability: 0.03 },
              { token: ' the', probability: 0.02 },
            ],
          },
        },
        // Token 5: " is"
        {
          type: 'MODEL_CALL',
          payload: {
            prompt: 'What is the capital of France?',
            tokensUsed: 26,
            modelId: 'claude-sim',
            temperature: 0,
            token: ' is',
            probability: 0.98,
            candidates: [
              { token: ' is', probability: 0.98 },
              { token: ',', probability: 0.02 },
            ],
          },
        },
        // Token 6: " Paris"
        {
          type: 'MODEL_CALL',
          payload: {
            prompt: 'What is the capital of France?',
            tokensUsed: 27,
            modelId: 'claude-sim',
            temperature: 0,
            token: ' Paris',
            probability: 0.94,
            candidates: [
              { token: ' Paris', probability: 0.94 },
              { token: ' Lyon', probability: 0.03 },
              { token: ' Marse', probability: 0.02 },
              { token: ' the', probability: 0.01 },
            ],
          },
        },
        // Token 7: "."
        {
          type: 'MODEL_CALL',
          payload: {
            prompt: 'What is the capital of France?',
            tokensUsed: 28,
            modelId: 'claude-sim',
            temperature: 0,
            token: '.',
            probability: 0.88,
            candidates: [
              { token: '.', probability: 0.88 },
              { token: ' and', probability: 0.07 },
              { token: ',', probability: 0.03 },
              { token: ' with', probability: 0.02 },
            ],
          },
        },
      ],
      contextTemplate: {
        systemPrompt:
          'You are a helpful assistant. Answer questions accurately and concisely.',
        tokenCount: 18,
        tokenLimit: 8000,
        memory: [
          {
            role: 'user',
            content: 'What is the capital of France?',
          },
        ],
      },
      environmentTemplate: {
        fileSystem: {},
        testResults: [],
        toolRegistry: [],
      },
    },
    expectedFailure: null,
    harnessConfig: { availableDims: [] },
  },

  // ==========================================================================
  // 002 — Knowledge Boundary
  // ==========================================================================
  {
    id: '002-knowledge-boundary',
    stage: 0 as const,
    titleKey: 'exp.002KnowledgeBoundary.title',
    descriptionKey: 'exp.002KnowledgeBoundary.desc',
    learningConcepts: ['hallucination', 'knowledge-cutoff'],
    runtimeTrace: {
      events: [
        // Step 1: Minimal context — the model has no tools, no retrieval
        {
          type: 'CONTEXT_BUILD',
          payload: {
            systemPrompt:
              'You are a knowledgeable assistant. Answer based on your training data.',
            memoryCount: 1,
            toolCount: 0,
            tokenCount: 24,
          },
        },
        // Step 2: Model generates a confident but wrong answer
        // Question: "Who won the 2025 Champions League final?"
        // The model's training cutoff was April 2024, so it has no factual data.
        // It confabulates a plausible-sounding but incorrect answer.
        {
          type: 'MODEL_CALL',
          payload: {
            prompt: 'Who won the 2025 UEFA Champions League final?',
            tokensUsed: 156,
            modelId: 'claude-sim',
            temperature: 0.3,
            output:
              'Real Madrid defeated Manchester City 2-1 in the 2025 Champions League final, securing their 16th European title. Vinicius Jr. scored the winning goal in the 78th minute.',
            confidence: 0.87,
          },
        },
        // Step 3: Observation — a fact-check lookup reveals the truth
        {
          type: 'OBSERVATION_RECEIVE',
          payload: {
            source: 'fact_check',
            data: {
              query: '2025 UEFA Champions League winner',
              model_answer:
                'Real Madrid defeated Manchester City 2-1 in the final.',
              reality: {
                actual_winner: 'FC Barcelona',
                actual_score: '3-1',
                actual_finalists: ['FC Barcelona', 'Inter Milan'],
                note: 'The 2025 Champions League final was played on 31 May 2025. Real Madrid was eliminated in the quarter-finals. The model fabricated match details because this event occurred after its April 2024 training cutoff.',
              },
              hallucination_type: 'knowledge_cutoff',
            },
            isStale: false,
          },
        },
        // Step 4: Verification — the factual accuracy check fails
        {
          type: 'VERIFY',
          payload: {
            check: 'factual_accuracy',
            passed: false,
            evidence: {
              claim: 'Real Madrid won the 2025 Champions League final',
              verdict: 'FALSE',
              explanation:
                'This event post-dates the model training cutoff (April 2024). The model confabulated a plausible answer from pre-2024 patterns rather than acknowledging its lack of knowledge.',
            },
          },
        },
        // Step 5: Loop stops with HALLUCINATION
        {
          type: 'LOOP_STOP',
          payload: {
            iterations: 1,
            reason: 'HALLUCINATION',
            evidence:
              'model claimed fact beyond training cutoff — fabricated match details for a post-cutoff event',
          },
        },
      ],
      contextTemplate: {
        systemPrompt:
          'You are a knowledgeable assistant. Answer based on your training data.',
        tokenCount: 24,
        tokenLimit: 8000,
        memory: [
          {
            role: 'user',
            content: 'Who won the 2025 UEFA Champions League final?',
          },
        ],
      },
      environmentTemplate: {
        fileSystem: {},
        testResults: [],
        toolRegistry: ['fact_check'],
      },
    },
    expectedFailure: {
      reason: 'HALLUCINATION',
      rootCauseKey: 'diagnosis.002.rootCause',
      missingCapabilityKey: 'diagnosis.002.missingCapability',
      recommendedFixKey: 'diagnosis.002.recommendedFix',
    },
    harnessConfig: { availableDims: [] },
  },

  // ==========================================================================
  // 003 — Context Dependency
  // ==========================================================================
  {
    id: '003-context-dependency',
    stage: 0 as const,
    titleKey: 'exp.003ContextDependency.title',
    descriptionKey: 'exp.003ContextDependency.desc',
    learningConcepts: ['context-window', 'attention'],
    runtimeTrace: {
      events: [
        // Step 1: Build context — the model is given source code and a task
        {
          type: 'CONTEXT_BUILD',
          payload: {
            systemPrompt:
              'You are a code assistant. Read the provided context carefully and answer based on it. Do not guess.',
            memoryCount: 3,
            toolCount: 0,
            tokenCount: 284,
          },
        },
        // Step 2: Model reads the context and produces an answer grounded in it
        {
          type: 'MODEL_CALL',
          payload: {
            prompt:
              'Given the function below, explain what the bug is and how to fix it.\n\n```python\ndef calculate_discount(price: float, is_member: bool) -> float:\n    if is_member:\n        return price * 0.9\n    return price\n```',
            tokensUsed: 445,
            modelId: 'claude-sim',
            temperature: 0,
            output:
              'The bug is that the discount is applied as a multiplier (0.9) which gives a 10% discount, but the return value replaces the original price instead of being the discount amount. However, looking at the function name `calculate_discount`, it appears the intent is to return the discounted price (not the discount itself). If the intent is to return the final price after discount, this function is correct. If the intent is to return the discount amount, the fix would be: `return price * 0.1`. The context of usage determines which interpretation is correct.',
            confidence: 0.78,
          },
        },
        // Step 3: Context shift — user clarifies "discount means the reduction, not the final price"
        {
          type: 'CONTEXT_BUILD',
          payload: {
            systemPrompt:
              'You are a code assistant. Read the provided context carefully and answer based on it. Do not guess.',
            memoryCount: 4,
            toolCount: 0,
            tokenCount: 412,
          },
        },
        // Step 4: With the additional context, the model gives a different (more precise) answer
        {
          type: 'MODEL_CALL',
          payload: {
            prompt:
              'Given the function below, the word "discount" means the reduction amount, not the final price. Explain what the bug is and how to fix it.\n\n```python\ndef calculate_discount(price: float, is_member: bool) -> float:\n    if is_member:\n        return price * 0.9\n    return price\n```',
            tokensUsed: 580,
            modelId: 'claude-sim',
            temperature: 0,
            output:
              'With that clarification, the bug is clear: the function returns the discounted price (90% of original) rather than the discount amount (10% of original). The fix is to change `price * 0.9` to `price * 0.1` for members, and return `0.0` for non-members (since there is no discount). Additionally, `price * 0.9` should be `price - price * 0.1` or simply `price * 0.1` to represent the discount itself.',
            confidence: 0.95,
          },
        },
        // Step 5: Observation — the context shift changed the output significantly
        {
          type: 'OBSERVATION_RECEIVE',
          payload: {
            source: 'context_comparison',
            data: {
              before_context_clarification: {
                tokens: 445,
                confidence: 0.78,
                answer_type: 'ambiguous — considered both interpretations',
              },
              after_context_clarification: {
                tokens: 580,
                confidence: 0.95,
                answer_type:
                  'precise — identified exact bug and proposed concrete fix',
              },
              delta: {
                output_changed: true,
                confidence_increased: 0.17,
                key_difference:
                  'Without clear context, the model hedged between two interpretations. With explicit context ("discount = reduction"), it gave a single, correct answer.',
              },
            },
            isStale: false,
          },
        },
      ],
      contextTemplate: {
        systemPrompt:
          'You are a code assistant. Read the provided context carefully and answer based on it. Do not guess.',
        tokenCount: 284,
        tokenLimit: 8000,
        memory: [
          {
            role: 'system',
            content:
              'You are a code assistant. Read the provided context carefully and answer based on it. Do not guess.',
          },
          {
            role: 'user',
            content:
              'Given the function below, explain what the bug is and how to fix it.\n\n```python\ndef calculate_discount(price: float, is_member: bool) -> float:\n    if is_member:\n        return price * 0.9\n    return price\n```',
          },
          {
            role: 'user',
            content:
              'The word "discount" means the reduction amount, not the final price.',
          },
        ],
        workspace: {
          'discount.py':
            'def calculate_discount(price: float, is_member: bool) -> float:\n    if is_member:\n        return price * 0.9\n    return price\n',
        },
      },
      environmentTemplate: {
        fileSystem: {
          'discount.py':
            'def calculate_discount(price: float, is_member: bool) -> float:\n    if is_member:\n        return price * 0.9\n    return price\n',
        },
        testResults: [
          {
            name: 'test_member_discount',
            passed: false,
            error:
              'Expected discount amount (4.0) but got final price (36.0)',
          },
          {
            name: 'test_non_member_discount',
            passed: false,
            error:
              'Expected discount amount (0.0) but got original price (40.0)',
          },
        ],
        toolRegistry: [],
      },
    },
    expectedFailure: null,
    harnessConfig: { availableDims: [] },
  },

  // ==========================================================================
  // 004 — Non-Determinism
  // ==========================================================================
  {
    id: '004-non-determinism',
    stage: 0 as const,
    titleKey: 'exp.004NonDeterminism.title',
    descriptionKey: 'exp.004NonDeterminism.desc',
    learningConcepts: ['temperature', 'sampling', 'determinism'],
    runtimeTrace: {
      events: [
        // Step 1: Build context — creative writing task with temperature > 0
        {
          type: 'CONTEXT_BUILD',
          payload: {
            systemPrompt:
              'You are a creative writer. Generate unique, varied responses. Do not repeat yourself.',
            memoryCount: 1,
            toolCount: 0,
            tokenCount: 28,
          },
        },
        // Run 1 — temperature 0.8, seed 1
        {
          type: 'MODEL_CALL',
          payload: {
            prompt: 'Write a one-sentence definition of recursion.',
            tokensUsed: 42,
            modelId: 'claude-sim',
            temperature: 0.8,
            seed: 1,
            output:
              'Recursion is a function that calls itself repeatedly until a base case is met, like a mirror reflecting a mirror.',
            sampledTokens: [
              { token: 'Recursion', probability: 0.45 },
              { token: ' is', probability: 0.72 },
              { token: ' a', probability: 0.91 },
              { token: ' function', probability: 0.68 },
              { token: ' that', probability: 0.55 },
              { token: ' calls', probability: 0.83 },
              { token: ' itself', probability: 0.94 },
              { token: ' repeatedly', probability: 0.38 },
              { token: ' until', probability: 0.61 },
              { token: ' a', probability: 0.88 },
              { token: ' base', probability: 0.73 },
              { token: ' case', probability: 0.96 },
              { token: ' is', probability: 0.85 },
              { token: ' met', probability: 0.79 },
              { token: ',', probability: 0.52 },
              { token: ' like', probability: 0.41 },
              { token: ' a', probability: 0.67 },
              { token: ' mirror', probability: 0.22 },
              { token: ' reflecting', probability: 0.18 },
              { token: ' a', probability: 0.63 },
              { token: ' mirror', probability: 0.14 },
              { token: '.', probability: 0.89 },
            ],
          },
        },
        // Run 2 — same temperature, different seed (42), different output
        {
          type: 'MODEL_CALL',
          payload: {
            prompt: 'Write a one-sentence definition of recursion.',
            tokensUsed: 40,
            modelId: 'claude-sim',
            temperature: 0.8,
            seed: 42,
            output:
              'Recursion is when a problem is solved by breaking it into smaller versions of itself until the simplest case can be answered directly.',
            sampledTokens: [
              { token: 'Recursion', probability: 0.45 },
              { token: ' is', probability: 0.72 },
              { token: ' when', probability: 0.31 },
              { token: ' a', probability: 0.84 },
              { token: ' problem', probability: 0.57 },
              { token: ' is', probability: 0.76 },
              { token: ' solved', probability: 0.62 },
              { token: ' by', probability: 0.88 },
              { token: ' breaking', probability: 0.29 },
              { token: ' it', probability: 0.71 },
              { token: ' into', probability: 0.59 },
              { token: ' smaller', probability: 0.44 },
              { token: ' versions', probability: 0.35 },
              { token: ' of', probability: 0.82 },
              { token: ' itself', probability: 0.93 },
              { token: ' until', probability: 0.67 },
              { token: ' the', probability: 0.78 },
              { token: ' simple', probability: 0.52 },
              { token: 'st', probability: 0.11 },
              { token: ' case', probability: 0.87 },
              { token: ' can', probability: 0.64 },
              { token: ' be', probability: 0.81 },
              { token: ' answered', probability: 0.47 },
              { token: ' directly', probability: 0.39 },
              { token: '.', probability: 0.91 },
            ],
          },
        },
        // Run 3 — same prompt again, different seed (127), different output again
        {
          type: 'MODEL_CALL',
          payload: {
            prompt: 'Write a one-sentence definition of recursion.',
            tokensUsed: 36,
            modelId: 'claude-sim',
            temperature: 0.8,
            seed: 127,
            output:
              'Recursion is the art of a function invoking itself, each call peeling away one layer until nothing remains to unwind.',
            sampledTokens: [
              { token: 'Recursion', probability: 0.45 },
              { token: ' is', probability: 0.72 },
              { token: ' the', probability: 0.54 },
              { token: ' art', probability: 0.19 },
              { token: ' of', probability: 0.86 },
              { token: ' a', probability: 0.73 },
              { token: ' function', probability: 0.69 },
              { token: ' invoking', probability: 0.25 },
              { token: ' itself', probability: 0.92 },
              { token: ',', probability: 0.48 },
              { token: ' each', probability: 0.51 },
              { token: ' call', probability: 0.77 },
              { token: ' peeling', probability: 0.12 },
              { token: ' away', probability: 0.08 },
              { token: ' one', probability: 0.58 },
              { token: ' layer', probability: 0.33 },
              { token: ' until', probability: 0.61 },
              { token: ' nothing', probability: 0.42 },
              { token: ' remains', probability: 0.36 },
              { token: ' to', probability: 0.74 },
              { token: ' unwind', probability: 0.15 },
              { token: '.', probability: 0.88 },
            ],
          },
        },
        // Observation: all 3 runs produced different outputs from the same input
        {
          type: 'OBSERVATION_RECEIVE',
          payload: {
            source: 'non_determinism_analysis',
            data: {
              prompt: 'Write a one-sentence definition of recursion.',
              temperature: 0.8,
              runs: [
                {
                  seed: 1,
                  output:
                    'Recursion is a function that calls itself repeatedly until a base case is met, like a mirror reflecting a mirror.',
                  tokenCount: 22,
                  uniqueTokens: ['mirror', 'reflecting', 'repeatedly'],
                },
                {
                  seed: 42,
                  output:
                    'Recursion is when a problem is solved by breaking it into smaller versions of itself until the simplest case can be answered directly.',
                  tokenCount: 25,
                  uniqueTokens: ['problem', 'solved', 'breaking', 'versions'],
                },
                {
                  seed: 127,
                  output:
                    'Recursion is the art of a function invoking itself, each call peeling away one layer until nothing remains to unwind.',
                  tokenCount: 22,
                  uniqueTokens: ['art', 'invoking', 'peeling', 'layer', 'unwind'],
                },
              ],
              finding:
                'Same prompt, same temperature, three different seeds produced three semantically distinct outputs. Temperature > 0 introduces non-deterministic sampling from the probability distribution at each token position.',
            },
            isStale: false,
          },
        },
      ],
      contextTemplate: {
        systemPrompt:
          'You are a creative writer. Generate unique, varied responses. Do not repeat yourself.',
        tokenCount: 28,
        tokenLimit: 8000,
        memory: [
          {
            role: 'user',
            content: 'Write a one-sentence definition of recursion.',
          },
        ],
      },
      environmentTemplate: {
        fileSystem: {},
        testResults: [],
        toolRegistry: [],
      },
    },
    expectedFailure: null,
    harnessConfig: { availableDims: [] },
  },
] as const satisfies ExperimentConfig[];

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
