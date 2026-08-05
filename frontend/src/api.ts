import type {
  AgentBlueprint,
  LevelInfo,
  MonteCarloResult,
  RunTrace,
  TraceStep,
  FailureReason,
} from './types';
import { ApiError } from './types';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';
const BASE = import.meta.env.VITE_API_BASE ?? '';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_LEVELS: LevelInfo[] = [
  {
    id: 'tutorial',
    name: 'Tutorial: Hello Agent',
    description:
      'Learn the basics by building a simple agent with a workspace and memory. No loops or custom graphs yet — just wire up the harness and run.',
    unlocked_harness: ['workspace', 'memory'],
    unlocked_loop: false,
    unlocked_graph: false,
    target_success_rate: 70,
    token_budget: 1000,
  },
  {
    id: 'intermediate',
    name: 'Intermediate: Loop Lab',
    description:
      'Unlock the ReAct+Reflexion loop strategy and experiment with retry limits. Configure a 3-node graph (planner, coder, reviewer) to solve harder tasks.',
    unlocked_harness: ['workspace', 'sandbox', 'memory'],
    unlocked_loop: true,
    unlocked_graph: true,
    target_success_rate: 80,
    token_budget: 5000,
  },
  {
    id: 'advanced',
    name: 'Advanced: Full Stack Agent',
    description:
      'All tools unlocked. Build a 4-node DAG with tester validation, git integration, and fine-tuned memory. Hit 95% success rate under 10K tokens.',
    unlocked_harness: ['workspace', 'sandbox', 'git', 'memory'],
    unlocked_loop: true,
    unlocked_graph: true,
    target_success_rate: 95,
    token_budget: 10000,
  },
];

const MOCK_TRACE_SUCCESS: RunTrace = {
  run_id: 'run-abc-001',
  status: 'SUCCESS',
  failure_reason: 'NONE',
  cost_tokens: 1247,
  steps: [
    {
      step: 1,
      node: 'planner',
      action: 'DECOMPOSE_TASK',
      status: 'SUCCESS',
      memory_used: 1,
    },
    {
      step: 2,
      node: 'coder',
      action: 'WRITE_FILE',
      status: 'SUCCESS',
      memory_used: 2,
    },
    {
      step: 3,
      node: 'reviewer',
      action: 'REVIEW_CODE',
      status: 'SUCCESS',
      memory_used: 3,
    },
    {
      step: 4,
      node: 'coder',
      action: 'EDIT_FILE',
      status: 'SUCCESS',
      memory_used: 3,
    },
    {
      step: 5,
      node: 'tester',
      action: 'RUN_TESTS',
      status: 'SUCCESS',
      memory_used: 4,
    },
    {
      step: 6,
      node: 'planner',
      action: 'FINALIZE',
      status: 'SUCCESS',
      memory_used: 4,
    },
  ],
};

const MOCK_TRACE_INFINITE_LOOP: RunTrace = {
  run_id: 'run-def-002',
  status: 'FAILED',
  failure_reason: 'INFINITE_LOOP_TRAP',
  cost_tokens: 3200,
  steps: [
    {
      step: 1,
      node: 'planner',
      action: 'DECOMPOSE_TASK',
      status: 'SUCCESS',
      memory_used: 1,
    },
    {
      step: 2,
      node: 'coder',
      action: 'WRITE_FILE',
      status: 'SUCCESS',
      memory_used: 2,
    },
    {
      step: 3,
      node: 'planner',
      action: 'RE_PLAN',
      status: 'SUCCESS',
      memory_used: 4,
    },
    {
      step: 4,
      node: 'coder',
      action: 'REWRITE_FILE',
      status: 'SUCCESS',
      memory_used: 5,
    },
    {
      step: 5,
      node: 'planner',
      action: 'RE_PLAN',
      status: 'SUCCESS',
      memory_used: 6,
      warning: 'Cycle detected: planner→coder→planner',
    },
    {
      step: 6,
      node: 'coder',
      action: 'REWRITE_FILE',
      status: 'FAIL',
      memory_used: 7,
      warning: 'Same file edited 3 times with no progress',
    },
    {
      step: 7,
      node: 'planner',
      action: 'RE_PLAN',
      status: 'FAIL',
      memory_used: 8,
      warning:
        'Detected infinite loop: planner↔coder cycle repeated 4 times. Aborting.',
    },
    {
      step: 8,
      node: 'reviewer',
      action: 'HALT',
      status: 'FAIL',
      memory_used: 8,
      warning: 'INFINITE_LOOP_TRAP triggered. Agent stuck in planning loop.',
    },
  ],
};

const MOCK_TRACE_CONTEXT_FULL: RunTrace = {
  run_id: 'run-ghi-003',
  status: 'FAILED',
  failure_reason: 'CONTEXT_FULL',
  cost_tokens: 4500,
  steps: [
    {
      step: 1,
      node: 'planner',
      action: 'DECOMPOSE_TASK',
      status: 'SUCCESS',
      memory_used: 2,
    },
    {
      step: 2,
      node: 'coder',
      action: 'WRITE_FILE',
      status: 'SUCCESS',
      memory_used: 5,
    },
    {
      step: 3,
      node: 'coder',
      action: 'APPEND_FILE',
      status: 'SUCCESS',
      memory_used: 8,
    },
    {
      step: 4,
      node: 'reviewer',
      action: 'REVIEW_CODE',
      status: 'FAIL',
      memory_used: 10,
      warning:
        'Context window exceeded at 128K tokens. Memory capacity (10) exhausted.',
    },
    {
      step: 5,
      node: 'planner',
      action: 'ABORT',
      status: 'FAIL',
      memory_used: 10,
      warning:
        'CONTEXT_FULL: Cannot proceed with review. Agent memory saturated.',
    },
  ],
};

function buildMockMonteCarlo(): MonteCarloResult {
  const dist: Record<FailureReason, number> = {
    NONE: 0,
    HALLUCINATED_TOOL: 3,
    FILE_CORROSION: 2,
    MEMORY_STACK_OVERFLOW: 1,
    CONTEXT_FULL: 2,
    INFINITE_LOOP_TRAP: 1,
    TASK_ABANDONED: 0,
  };

  const successCount = 91;
  const total = successCount + Object.values(dist).reduce((a, b) => a + b, 0);

  return {
    success_rate: Math.round((successCount / total) * 100),
    avg_tokens: 2150,
    failure_distribution: dist,
    sample_traces: [MOCK_TRACE_SUCCESS, MOCK_TRACE_INFINITE_LOOP, MOCK_TRACE_CONTEXT_FULL],
  };
}

// ── API Functions ──────────────────────────────────────────────────────────

export async function getLevels(): Promise<LevelInfo[]> {
  if (USE_MOCKS) {
    await delay(400);
    return [...MOCK_LEVELS];
  }
  const res = await fetch(`${BASE}/api/levels`);
  if (!res.ok) throw new ApiError('Failed to fetch levels', res.status);
  return res.json();
}

export async function getLevel(id: string): Promise<LevelInfo> {
  if (USE_MOCKS) {
    await delay(300);
    const level = MOCK_LEVELS.find((l) => l.id === id);
    if (!level) throw new ApiError(`Level not found: ${id}`, 404);
    return { ...level };
  }
  const res = await fetch(`${BASE}/api/levels/${id}`);
  if (!res.ok) throw new ApiError(`Failed to fetch level ${id}`, res.status);
  return res.json();
}

export async function simulate(blueprint: AgentBlueprint): Promise<RunTrace> {
  if (USE_MOCKS) {
    await delay(800);
    // Return different traces based on the blueprint to feel interactive
    const hasTester = blueprint.graph_nodes.some((n) => n.role === 'tester');
    const hasLoop = blueprint.loop_strategy.type !== 'none';

    if (hasTester && hasLoop) return { ...MOCK_TRACE_SUCCESS, run_id: `run-${Date.now()}` };
    if (hasLoop) return { ...MOCK_TRACE_INFINITE_LOOP, run_id: `run-${Date.now()}` };
    return { ...MOCK_TRACE_CONTEXT_FULL, run_id: `run-${Date.now()}` };
  }
  const res = await fetch(`${BASE}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blueprint }),
  });
  if (!res.ok) throw new ApiError('Simulation failed', res.status);
  return res.json();
}

export async function monteCarlo(
  blueprint: AgentBlueprint,
  numRuns: number = 100,
): Promise<MonteCarloResult> {
  if (USE_MOCKS) {
    await delay(1500);
    return buildMockMonteCarlo();
  }
  const res = await fetch(`${BASE}/api/monte-carlo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blueprint, num_runs: numRuns }),
  });
  if (!res.ok) throw new ApiError('Monte Carlo simulation failed', res.status);
  return res.json();
}

export function connectSimulationWebSocket(
  runId: string,
  onStep: (step: TraceStep) => void,
  onComplete: (trace: RunTrace) => void,
): WebSocket {
  if (USE_MOCKS) {
    // Fake WebSocket: replay steps from a mock trace with delays
    const fakeWs = {
      close: () => {
        if (fakeWs._timer) clearTimeout(fakeWs._timer);
      },
      _timer: 0 as ReturnType<typeof setTimeout> | 0,
    };

    const trace = { ...MOCK_TRACE_SUCCESS, run_id: runId };
    let idx = 0;

    function emitNext() {
      if (idx < trace.steps.length) {
        onStep({ ...trace.steps[idx] });
        idx++;
        fakeWs._timer = setTimeout(emitNext, 600);
      } else {
        onComplete(trace);
      }
    }

    fakeWs._timer = setTimeout(emitNext, 300);
    return fakeWs as unknown as WebSocket;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = `${protocol}://${window.location.host}/ws/simulate/${runId}`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'step') {
      onStep(data.step as TraceStep);
    } else if (data.type === 'complete') {
      onComplete(data.trace as RunTrace);
    }
  };

  ws.onerror = () => {
    console.error('WebSocket error');
  };

  return ws;
}
