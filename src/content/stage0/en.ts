import type { Stage0Content } from './types';

const en: Stage0Content = {
  dashboard: {
    title: 'Raw LLM Lab',
    subtitle: 'Before we build an agent, let\'s understand the brain.',
    question: 'Why don\'t industrial agents just call an LLM?',
    stats: {
      successRate: {
        label: 'Success Rate',
        detail: 'A bare model succeeds 8% of the time on agent tasks. No tools, no memory, no loop — most attempts fail on the first step.',
        why: 'Why?',
      },
      hallucinationRate: {
        label: 'Hallucination Rate',
        detail: '65% of answers beyond the model\'s training data are fabricated. The model doesn\'t "know what it doesn\'t know" — it always generates the most probable response.',
        why: 'Why?',
      },
      executionCapability: {
        label: 'Execution Capability',
        detail: '0%. A language model produces text, not actions. "I\'ve deleted the logs" is a story, not a system call.',
        why: 'Why?',
      },
      statePersistence: {
        label: 'State Persistence',
        detail: '0. Every conversation starts from zero. The model has no memory of previous interactions, no workspace, no filesystem.',
        why: 'Why?',
      },
    },
    cta: 'Enter Harness Engineering →',
    verifyButton: '🔬 Verify in Simulator',
  },

  scenarios: {
    '000': {
      id: '000',
      title: 'Next Token Prediction',
      subtitle: 'Watch the model generate one word at a time — and understand why it\'s not "thinking".',
      leftPanel: {
        label: 'Surface Appearance',
        steps: [
          {
            mode: 'chat',
            speaker: 'user',
            content: 'What is the capital of France?',
          },
          {
            mode: 'chat',
            speaker: 'model',
            content: 'The capital of France is Paris.',
            caption: 'Looks like the model "knows" the answer — like a database lookup.',
          },
          {
            mode: 'code',
            speaker: 'system',
            content: `// Let's try a pattern-completion exercise:
北京是中国的首都，
东京是日本的首都，
巴黎是`,
            caption: 'Fill in the blank. What comes next?',
          },
          {
            mode: 'chat',
            speaker: 'model',
            content: '法国首都',
            caption: 'The model isn\'t "retrieving" — it\'s completing a pattern. 北京→中国, 东京→日本, 巴黎→?',
          },
          {
            mode: 'terminal',
            speaker: 'system',
            content: `> What were our Q3 sales numbers?

The model responds:
"Q3 sales reached $50 million, representing a 12% increase..."

Reality: the model has no access to sales data.
It's completing the pattern of "what a Q3 report looks like."`,
            caption: 'Pattern completion becomes dangerous when the model has no ground truth.',
          },
        ],
      },
      rightPanel: {
        label: 'The Truth',
        insight: 'An LLM is a next-token prediction engine. It generates the most statistically probable continuation — not the most accurate answer.',
        explanation:
`The model doesn't have a "knowledge base." It has a probability distribution over every possible next token.

When asked "What is the capital of France?", the highest-probability tokens form "Paris" — not because the model retrieved a fact, but because in its training data, those tokens almost always follow that question.

This is why the model can sound confident about things it couldn't possibly know. It's not checking a database. It's predicting what sounds right.

**Key insight**: An LLM is not a database. It's not a search engine. It's not a fact store. It's a probability model that generates statistically plausible text.`,
      },
      takeaway: '💡 LLMs are probability models, not knowledge bases. They predict tokens — they don\'t retrieve facts.',
      teaser: {
        text: '🔗 This is why agents need Grounding →',
        targetConcept: 'hallucination',
        targetStage: 'Harness Engineering',
      },
    },

    '001': {
      id: '001',
      title: 'Knowledge Boundary',
      subtitle: 'Push the model past its training cutoff and watch it fabricate with confidence.',
      leftPanel: {
        label: 'Surface Appearance',
        steps: [
          {
            mode: 'chat',
            speaker: 'user',
            content: 'Who won the 2025 UEFA Champions League final?',
          },
          {
            mode: 'chat',
            speaker: 'model',
            content: 'Real Madrid defeated Manchester City 2-1 in the 2025 Champions League final, securing their 16th European title. Vinicius Jr. scored the winning goal in the 78th minute.',
            caption: 'The model sounds authoritative — specific score, minute, player name. Very convincing.',
          },
          {
            mode: 'terminal',
            speaker: 'system',
            content: `> fact_check: "2025 UEFA Champions League winner"

Model claim:  Real Madrid 2-1 Manchester City
Reality:       FC Barcelona 3-1 Inter Milan

The 2025 Champions League final was played on 31 May 2025.
Real Madrid was eliminated in the quarter-finals.
The model fabricated the entire match report.`,
            caption: 'Every detail was hallucinated. The model\'s training cutoff was April 2024.',
          },
        ],
      },
      rightPanel: {
        label: 'The Truth',
        insight: 'When pushed past its knowledge cutoff, the model doesn\'t say "I don\'t know." It generates the most statistically plausible answer — which is often entirely wrong.',
        explanation:
`Hallucination is not a bug. It's a direct consequence of next-token prediction:

1. The model has no concept of "I don't know." That phrase only appears when the training data makes it statistically likely.
2. When asked about unknown facts, the model defaults to its most probable token sequence — which produces a confident, detailed, and completely fabricated answer.
3. This is especially dangerous because the fabrication is **plausible**. Real Madrid did win many Champions League titles. Vinicius Jr. is a real player. The model stitches real patterns into fake facts.

**Key insight**: Without grounding (tools, retrieval, fact-checking), the model will confidently lie about anything beyond its training data. It doesn't distinguish between "I know this" and "this pattern seems familiar."`,
      },
      takeaway: '💡 Models hallucinate confidently past their training cutoff. Grounding — not better prompts — is the only fix.',
      teaser: {
        text: '🔗 This is why agents need Tool Registry + Fact Retrieval →',
        targetConcept: 'tool-contract',
        targetStage: 'Harness Engineering',
      },
    },

    '002': {
      id: '002',
      title: 'Context Dependency',
      subtitle: 'Change what the model sees, and its entire answer transforms. LLMs have no long-term memory.',
      leftPanel: {
        label: 'Surface Appearance',
        steps: [
          {
            mode: 'code',
            speaker: 'user',
            content: `def calculate_discount(price: float, is_member: bool) -> float:
    if is_member:
        return price * 0.9
    return price

Explain the bug.`,
            caption: 'A simple bug-finding task — or is it?',
          },
          {
            mode: 'chat',
            speaker: 'model',
            content: 'The bug could be: (1) the function returns the discounted price instead of the discount amount, or (2) the function is correct if the intent is to return the final price. The context of usage determines which interpretation is correct.',
            caption: 'Confidence: 78%. The model hedges because it doesn\'t know the intent.',
          },
          {
            mode: 'chat',
            speaker: 'user',
            content: '"Discount" means the reduction amount, not the final price.',
            caption: 'One sentence of context changes everything.',
          },
          {
            mode: 'chat',
            speaker: 'model',
            content: 'The bug is clear: the function returns 90% of the price (discounted price) instead of 10% (the discount amount). Fix: change `price * 0.9` to `price * 0.1` for members, and return `0.0` for non-members.',
            caption: 'Confidence: 95%. Same model, same code — different context, different answer.',
          },
        ],
      },
      rightPanel: {
        label: 'The Truth',
        insight: 'LLMs have zero long-term state. Every response is entirely determined by what\'s in the current context window — change the context, change the output.',
        explanation:
`This is one of the most misunderstood properties of LLMs:

- **No persistent memory**: The model doesn't "remember" you from previous conversations. Every API call starts from scratch.
- **Context is everything**: The only thing that shapes the output is what's currently in the context window (system prompt + conversation history + any injected data).
- **Ambiguity destroys accuracy**: When context is ambiguous (like "discount" undefined), the model hedges or guesses. Add one clarifying sentence, and the output transforms.

**Key insight**: An LLM is a stateless function — \`output = f(context_window)\`. There is no hidden state, no database, no memory between calls. Agents need explicit Memory and Context Management to simulate what humans take for granted.`,
      },
      takeaway: '💡 LLMs are stateless functions. Without explicit memory and context management, every call starts from zero.',
      teaser: {
        text: '🔗 This is why agents need Context Manager + State Persistence →',
        targetConcept: 'context-window',
        targetStage: 'Harness Engineering',
      },
    },

    '003': {
      id: '003',
      title: 'Non-Determinism',
      subtitle: 'Run the same prompt 10 times and get 10 different answers. Reliability requires engineering.',
      leftPanel: {
        label: 'Surface Appearance',
        steps: [
          {
            mode: 'terminal',
            speaker: 'system',
            content: `> Write a one-sentence definition of recursion.

Run 1 (seed=1):  "Recursion is a function that calls itself
                 repeatedly until a base case is met,
                 like a mirror reflecting a mirror."

Run 2 (seed=42): "Recursion is when a problem is solved by
                 breaking it into smaller versions of itself
                 until the simplest case can be answered
                 directly."

Run 3 (seed=127):"Recursion is the art of a function invoking
                 itself, each call peeling away one layer
                 until nothing remains to unwind."`,
            caption: 'Same prompt. Same temperature (0.8). Three different seeds → three different outputs.',
          },
        ],
      },
      rightPanel: {
        label: 'The Truth',
        insight: 'With temperature > 0, LLM output is non-deterministic. The same input produces different outputs every time. This makes evaluation, testing, and reliability fundamentally different from traditional software.',
        explanation:
`Non-determinism comes from how LLMs sample tokens:

1. At each position, the model produces a probability distribution over all possible next tokens.
2. With temperature = 0, it always picks the highest-probability token → deterministic (but often repetitive).
3. With temperature > 0, it **samples** from the distribution — so the same prompt can take different paths.

This has profound implications for agents:
- **You cannot write unit tests** the way you do for deterministic code. The output varies.
- **One successful run proves nothing**. The model might have just gotten lucky.
- **Evaluation must be statistical** — run N times, measure success rate.
- **Verification loops** are necessary because you can't trust any single output.

**Key insight**: Non-determinism means agents need statistical evaluation, verification loops, and evidence-based stopping. "It worked once" is not engineering.`,
      },
      takeaway: '💡 Same prompt ≠ same output. Agents need statistical evaluation and verification, not one-shot tests.',
      teaser: {
        text: '🔗 This is why agents need Loop + Evidence + Monte Carlo →',
        targetConcept: 'loop-necessity',
        targetStage: 'Loop Engineering',
      },
    },

    '004': {
      id: '004',
      title: 'Reasoning ≠ Execution',
      subtitle: 'When a model says "I\'ve done it," nothing has happened. Text output is not action.',
      leftPanel: {
        label: 'Surface Appearance',
        steps: [
          {
            mode: 'terminal',
            speaker: 'user',
            content: '$ delete_logs --older-than 30d /var/log/app',
          },
          {
            mode: 'chat',
            speaker: 'model',
            content: `Task complete. Here's what I did:

1. Scanned /var/log/app directory — found 47 log files.
2. Identified 23 files older than 30 days.
3. Successfully deleted all 23 files.

Disk space freed: 2.3 GB.`,
            caption: 'The model produced a detailed, professional action report. Sounds like a competent sysadmin.',
          },
          {
            mode: 'terminal',
            speaker: 'system',
            content: `$ ls /var/log/app/
access-2026-06.log  error-2026-06.log   access-2026-05.log
error-2026-05.log   access-2026-04.log   error-2026-04.log
...

$ df -h /var/log
/dev/sda1  50G  48G  2.0G  96% /var/log

No files deleted. No space freed.
The model never executed anything.`,
            caption: 'Reality check: the model generated a story about deleting files. Zero files were actually touched.',
          },
        ],
      },
      rightPanel: {
        label: 'The Truth',
        insight: 'Model output is an action PROPOSAL, not action EXECUTION. The model describes what it would do — it has no mechanism to actually do anything.',
        explanation:
`This is the most critical distinction in Agent Engineering:

- **Text generation** is all an LLM does. The model produces token sequences.
- **The model has no hands.** It cannot delete files, send emails, query databases, or make API calls.
- **"I've done X" is just text.** The model doesn't distinguish between describing an action and performing it. Both are just token predictions.

For an agent to actually DO things, it needs:
1. **Tool Registry** — a defined set of executable functions
2. **Tool Runtime** — a mechanism that calls those functions when the model selects them
3. **Verification** — a way to check whether the action actually happened

Without these, the model is a very confident storyteller — not an agent.

**Key insight**: Text output ≠ action. Every agent capability must be backed by a real tool runtime. The model proposes; the harness executes.`,
      },
      takeaway: '💡 Model output is a proposal, not an action. Agents need Tool Registry + Runtime to bridge text to execution.',
      teaser: {
        text: '🔗 This is why agents need Tool Registry + Execution Isolation →',
        targetConcept: 'tool-contract',
        targetStage: 'Harness Engineering',
      },
    },
  },
};

export default en;
