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
    id: 'level_1_raw',
    name: 'The Raw Agent',
    description:
      'No harness, no loop, no graph. A single coder node operating without any safety nets. Expect lots of failures — learn what breaks when an agent has zero infrastructure.',
    unlocked_harness: [],
    unlocked_loop: false,
    unlocked_graph: false,
    target_success_rate: 0.08,
    token_budget: 10_000,
  },
  {
    id: 'level_2_harness',
    name: 'Safety Harness',
    description:
      'Unlock workspace, sandbox, Git, and memory buffer. Still no loop strategy, so a single test failure means the task is abandoned. Learn how infrastructure reduces common failure modes.',
    unlocked_harness: ['workspace', 'sandbox', 'git', 'memory'],
    unlocked_loop: false,
    unlocked_graph: false,
    target_success_rate: 0.40,
    token_budget: 20_000,
  },
  {
    id: 'level_3_loop',
    name: 'The Loop',
    description:
      'Unlock the ReAct+Reflexion loop strategy with up to 5 retries and a test_pass stop condition. The agent can now recover from failures automatically. Master the feedback loop.',
    unlocked_harness: ['workspace', 'sandbox', 'git', 'memory'],
    unlocked_loop: true,
    unlocked_graph: false,
    target_success_rate: 0.70,
    token_budget: 50_000,
  },
  {
    id: 'level_4_graph',
    name: 'The Graph',
    description:
      'Unlock the multi-agent graph: planner → coder → reviewer. Each agent has isolated memory, and the chain provides built-in review. Full harness + loop enabled. Reach near-perfect reliability.',
    unlocked_harness: ['workspace', 'sandbox', 'git', 'memory'],
    unlocked_loop: true,
    unlocked_graph: true,
    target_success_rate: 0.90,
    token_budget: 100_000,
  },
];

const MOCK_TRACE_SUCCESS: RunTrace = {
  run_id: 'run-abc-001',
  status: 'SUCCESS',
  failure_reason: 'NONE',
  cost_tokens: 1247,
  steps: [
    { step: 1, node: 'node_1', action: 'THINK', status: 'SUCCESS', memory_used: 1 },
    { step: 2, node: 'node_1', action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 2 },
    { step: 3, node: 'node_1', action: 'RUN_TEST', status: 'SUCCESS', memory_used: 3 },
    { step: 4, node: 'node_1', action: 'RETRY', status: 'SUCCESS', memory_used: 3, reflection: 'reflect_test_fail' },
    { step: 5, node: 'node_1', action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 4 },
    { step: 6, node: 'node_1', action: 'RUN_TEST', status: 'SUCCESS', memory_used: 4 },
  ],
  failure_events: [],
  topology: { kind: 'single', has_feedback: false, parallel_coders: 0, isolated_nodes: [] },
};

const MOCK_TRACE_INFINITE_LOOP: RunTrace = {
  run_id: 'run-def-002',
  status: 'FAILED',
  failure_reason: 'INFINITE_LOOP_TRAP',
  cost_tokens: 3200,
  steps: [
    { step: 1, node: 'node_1', action: 'THINK', status: 'SUCCESS', memory_used: 1 },
    { step: 2, node: 'node_1', action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 2 },
    { step: 3, node: 'node_1', action: 'RUN_TEST', status: 'FAIL', memory_used: 4, warning: 'Test failed: 2 assertions failed' },
    { step: 4, node: 'node_1', action: 'RETRY', status: 'FAIL', memory_used: 5, warning: 'Same edit applied, test still failing', reflection: 'reflect_test_fail' },
    { step: 5, node: 'node_1', action: 'RETRY', status: 'FAIL', memory_used: 6, warning: 'Retry #2: no progress detected', reflection: 'reflect_wrong_file' },
    { step: 6, node: 'node_1', action: 'RETRY', status: 'FAIL', memory_used: 7, warning: 'Retry #3: same fix applied again', reflection: 'reflect_off_by_one' },
    { step: 7, node: 'node_1', action: 'RETRY', status: 'FAIL', memory_used: 8, warning: 'Agent stuck in infinite retry loop — retries exhausted without success. Add a stop_condition (test_pass) or increase max_retries.' },
  ],
  failure_events: [{ reason: 'INFINITE_LOOP_TRAP', step: 7 }],
  topology: { kind: 'single', has_feedback: false, parallel_coders: 0, isolated_nodes: [] },
};

const MOCK_TRACE_CONTEXT_FULL: RunTrace = {
  run_id: 'run-ghi-003',
  status: 'FAILED',
  failure_reason: 'CONTEXT_FULL',
  cost_tokens: 4500,
  steps: [
    { step: 1, node: 'node_1', action: 'THINK', status: 'SUCCESS', memory_used: 2 },
    { step: 2, node: 'node_1', action: 'EDIT_FILE', status: 'SUCCESS', memory_used: 5 },
    { step: 3, node: 'node_1', action: 'RUN_TEST', status: 'FAIL', memory_used: 7, warning: 'Test failed — retrying' },
    { step: 4, node: 'node_1', action: 'RETRY', status: 'FAIL', memory_used: 10, warning: 'Context window full — memory capacity exhausted during retry loop. Increase memory capacity or use sub-agents to isolate context.' },
  ],
  failure_events: [{ reason: 'CONTEXT_FULL', step: 4 }],
  topology: { kind: 'single', has_feedback: false, parallel_coders: 0, isolated_nodes: [] },
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
    const hasLoop = blueprint.loop_strategy.type !== 'none';
    const hasGraph = blueprint.graph_nodes.length >= 3;
    const hasHarness = blueprint.harness.has_git || blueprint.harness.has_sandbox;

    if (hasGraph && hasLoop) return { ...MOCK_TRACE_SUCCESS, run_id: `run-${Date.now()}` };
    if (hasLoop && !hasGraph) return { ...MOCK_TRACE_INFINITE_LOOP, run_id: `run-${Date.now()}` };
    if (hasHarness && !hasLoop) return { ...MOCK_TRACE_CONTEXT_FULL, run_id: `run-${Date.now()}` };
    // No harness, no loop, no graph — raw agent
    const hallucinatedTrace: RunTrace = {
      run_id: `run-${Date.now()}`,
      status: 'FAILED',
      failure_reason: 'HALLUCINATED_TOOL',
      cost_tokens: 800,
      steps: [
        { step: 1, node: 'node_1', action: 'THINK', status: 'SUCCESS', memory_used: 1 },
        { step: 2, node: 'node_1', action: 'EDIT_FILE', status: 'FAIL', memory_used: 2, warning: 'Agent attempted to use a tool that does not exist — no sandbox or workspace available. Add Sandbox or Git Workspace.' },
      ],
      failure_events: [{ reason: 'HALLUCINATED_TOOL', step: 2 }],
    };
    return hallucinatedTrace;
  }
  const res = await fetch(`${BASE}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(blueprint),
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
  const data = await res.json();
  // Backend returns 0–1; UI expects 0–100
  return {
    ...data,
    success_rate:
      data.success_rate <= 1
        ? Math.round(data.success_rate * 10000) / 100
        : data.success_rate,
  };
}

export function connectSimulationWebSocket(
  runId: string,
  onStep: (step: TraceStep) => void,
  onComplete: (trace: RunTrace) => void,
): WebSocket {
  if (USE_MOCKS) {
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
