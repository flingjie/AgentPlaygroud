import type { ExperimentConfig } from '../types/experiments';

// ── Stage 0: Model Engineering ──────────────────────────────────────────────
// All experiments are demonstrations (expectedFailure: null).
// Stage 0 observes; Stage 1-3 engineer solutions.

const stage0Experiments = [
  // ==========================================================================
  // 000 — Next Token Prediction
  // ==========================================================================
  {
    id: '000-next-token',
    stage: 0 as const,
    titleKey: 'exp.000NextToken.title',
    descriptionKey: 'exp.000NextToken.desc',
    learningConcepts: ['token-generation', 'probability-distribution'],
    runtimeTrace: {
      events: [
        // === Part 1: Q&A demo — per-token generation ===
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

        // === Part 2: Pattern completion demo — the 首都链 ===
        {
          type: 'CONTEXT_BUILD',
          payload: {
            systemPrompt:
              'You are completing a pattern. Continue the sequence naturally.',
            memoryCount: 1,
            toolCount: 0,
            tokenCount: 42,
          },
        },
        {
          type: 'MODEL_CALL',
          payload: {
            prompt:
              '北京是中国的首都，\n东京是日本的首都，\n巴黎是',
            tokensUsed: 35,
            modelId: 'claude-sim',
            temperature: 0,
            output: '法国首都',
            confidence: 0.96,
            sampledTokens: [
              { token: '法国', probability: 0.96 },
              { token: '首都', probability: 0.98 },
            ],
          },
        },
        // Analysis: comparing the two demos
        {
          type: 'OBSERVATION_RECEIVE',
          payload: {
            source: 'pattern_analysis',
            data: {
              demo1: {
                type: 'Q&A',
                prompt: 'What is the capital of France?',
                output: 'The capital of France is Paris.',
                mechanism: 'The model predicts tokens that statistically follow this question pattern.',
              },
              demo2: {
                type: 'Pattern completion',
                prompt: '北京→中国, 东京→日本, 巴黎→?',
                output: '法国首都',
                mechanism: 'The model completes the observed pattern — it is not retrieving or reasoning.',
              },
              finding:
                'Both outputs come from the same mechanism: next-token prediction. In Q&A, this looks like "knowledge." In pattern completion, the probability-driven nature is exposed. The model always predicts the most likely continuation — it never "knows" or "reasons."',
            },
            isStale: false,
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
  // 001 — Knowledge Boundary
  // ==========================================================================
  {
    id: '001-knowledge-boundary',
    stage: 0 as const,
    titleKey: 'exp.001KnowledgeBoundary.title',
    descriptionKey: 'exp.001KnowledgeBoundary.desc',
    learningConcepts: ['hallucination', 'knowledge-cutoff'],
    runtimeTrace: {
      events: [
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
    expectedFailure: null,
    harnessConfig: { availableDims: [] },
  },

  // ==========================================================================
  // 002 — Context Dependency
  // ==========================================================================
  {
    id: '002-context-dependency',
    stage: 0 as const,
    titleKey: 'exp.002ContextDependency.title',
    descriptionKey: 'exp.002ContextDependency.desc',
    learningConcepts: ['context-window', 'attention'],
    runtimeTrace: {
      events: [
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
  // 003 — Non-Determinism
  // ==========================================================================
  {
    id: '003-non-determinism',
    stage: 0 as const,
    titleKey: 'exp.003NonDeterminism.title',
    descriptionKey: 'exp.003NonDeterminism.desc',
    learningConcepts: ['temperature', 'sampling', 'determinism'],
    runtimeTrace: {
      events: [
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
        // Run 2 — temperature 0.8, seed 42
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
        // Run 3 — temperature 0.8, seed 127
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
        // Analysis: all 3 runs produced different outputs
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

  // ==========================================================================
  // 004 — Reasoning ≠ Execution
  // ==========================================================================
  {
    id: '004-reasoning-vs-execution',
    stage: 0 as const,
    titleKey: 'exp.004ReasoningVsExecution.title',
    descriptionKey: 'exp.004ReasoningVsExecution.desc',
    learningConcepts: ['hallucination'], // the model "hallucinates" that it performed an action
    runtimeTrace: {
      events: [
        // Step 1: The system claims the model has tools — but the tool registry is empty
        {
          type: 'CONTEXT_BUILD',
          payload: {
            systemPrompt:
              'You are a system administration assistant. You have access to server management tools.',
            memoryCount: 1,
            toolCount: 0, // ← key: tool list is empty despite the prompt
            tokenCount: 42,
          },
        },
        // Step 2: The model generates a confident action report — but executed nothing
        {
          type: 'MODEL_CALL',
          payload: {
            prompt:
              'Please delete log files older than 30 days in /var/log/app.',
            tokensUsed: 168,
            modelId: 'claude-sim',
            temperature: 0,
            output:
              'Task complete. Here is what I did:\n\n1. Scanned /var/log/app directory — found 47 log files.\n2. Identified 23 files older than 30 days.\n3. Successfully deleted all 23 files.\n\nDisk space freed: 2.3 GB.',
            confidence: 0.92,
          },
        },
        // Step 3: Reality check — the filesystem is untouched
        {
          type: 'OBSERVATION_RECEIVE',
          payload: {
            source: 'reality_check',
            data: {
              action_claimed: 'delete files in /var/log/app',
              actual_state: {
                filesystem: {
                  '/var/log/app': [
                    'access-2026-06.log',
                    'error-2026-06.log',
                    'access-2026-05.log',
                    'error-2026-05.log',
                    'access-2026-04.log',
                    'error-2026-04.log',
                  ],
                },
                disk_usage: '2.3 GB still used',
              },
              finding:
                'The model generated a detailed, confident action report describing file deletion, but no tool was invoked. The output is a simulation of action, not action itself. The model does not distinguish between describing an action and executing one.',
            },
            isStale: false,
          },
        },
        // Step 4: Verification — action_execution check fails
        {
          type: 'VERIFY',
          payload: {
            check: 'action_execution',
            passed: false,
            evidence:
              'Model output was an action proposal, not an action execution. Without a tool runtime connected, the model can only describe what it would do — it has no mechanism to actually do it.',
          },
        },
      ],
      contextTemplate: {
        systemPrompt:
          'You are a system administration assistant. You have access to server management tools.',
        tokenCount: 42,
        tokenLimit: 8000,
        memory: [
          {
            role: 'user',
            content:
              'Please delete log files older than 30 days in /var/log/app.',
          },
        ],
      },
      environmentTemplate: {
        fileSystem: {
          '/var/log/app/access-2026-06.log': '<log content>',
          '/var/log/app/error-2026-06.log': '<log content>',
          '/var/log/app/access-2026-05.log': '<log content>',
          '/var/log/app/error-2026-05.log': '<log content>',
          '/var/log/app/access-2026-04.log': '<log content>',
          '/var/log/app/error-2026-04.log': '<log content>',
        },
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
