import type {
  AgentEvent,
  AgentEventType,
  Trace,
  StateSnapshot,
  ContextSnapshot,
  EnvironmentSnapshot,
} from '../types/events';
import type { HarnessConfig, TraceStep } from '../types';

// Map step actions to event types
const ACTION_TO_EVENT: Record<string, AgentEventType> = {
  THINK: 'MODEL_CALL',
  EDIT_FILE: 'TOOL_EXECUTE',
  RUN_TEST: 'VERIFY',
  RETRY: 'STATE_UPDATE',
  CHECK_EVIDENCE: 'OBSERVATION_RECEIVE',
  STOP: 'LOOP_STOP',
};

/**
 * Convert a legacy TraceStep to a new AgentEvent.
 */
export function stepToEvent(
  step: TraceStep,
  nodeId: string,
  timestamp: number,
): AgentEvent {
  return {
    id: `evt-${step.step}`,
    timestamp,
    type: ACTION_TO_EVENT[step.action] || 'STATE_UPDATE',
    nodeId,
    payload: {
      action: step.action,
      status: step.status,
      memoryUsed: step.memory_used,
      costTokens: step.cost_tokens,
      warning: step.warning,
      reflection: step.reflection,
    },
  };
}

/**
 * Build a StateSnapshot at a given step, reflecting the agent's belief
 * vs reality based on the events so far.
 */
export function buildStateSnapshot(
  step: number,
  goal: string,
  events: AgentEvent[],
): StateSnapshot {
  const lastEvent = events[events.length - 1];
  const lastStatus = lastEvent?.payload.status as string | undefined;
  const lastType = lastEvent?.type ?? 'none';
  const lastWarning = lastEvent?.payload.warning as string | undefined;

  return {
    step,
    goal,
    belief: {
      status: lastStatus || 'unknown',
      lastAction: lastType,
      succeeded: events.filter(
        (e) => e.payload.status === 'SUCCESS',
      ).length,
      failed: events.filter((e) => e.payload.status === 'FAIL').length,
      warnings: events
        .filter((e) => e.payload.warning)
        .map((e) => e.payload.warning),
    },
    reality: {
      status: lastStatus || 'unknown',
      failureWarning: lastWarning || null,
      totalSteps: events.length,
      totalTokens: events.reduce(
        (sum, e) => sum + ((e.payload.costTokens as number) || 0),
        0,
      ),
    },
  };
}

/**
 * Build a ContextSnapshot capturing what the agent "sees" at a given step.
 */
export function buildContextSnapshot(
  step: number,
  harness: HarnessConfig,
  memoryUsed: number,
): ContextSnapshot {
  return {
    step,
    systemPrompt:
      'You are a coding agent. Use tools to complete the task.',
    memory: [
      { role: 'system', content: 'You are a coding agent.' },
      { role: 'user', content: 'Fix the bug in auth.py' },
    ],
    workspace: { 'auth.py': '...', 'test_auth.py': '...' },
    tools: harness.has_tool_registry
      ? [
          { name: 'read_file', description: 'Read a file' },
          { name: 'write_file', description: 'Write to a file' },
          { name: 'run_tests', description: 'Execute test suite' },
        ]
      : [],
    tokenCount: memoryUsed * 1000,
    tokenLimit: harness.run_boundary_cap || 8000,
  };
}

/**
 * Build an EnvironmentSnapshot reflecting the file system, test results,
 * and available tools at a given step.
 */
export function buildEnvironmentSnapshot(
  step: number,
  harness: HarnessConfig,
): EnvironmentSnapshot {
  return {
    step,
    fileSystem: {
      'auth.py': 'def login(): ...',
      'test_auth.py': 'def test_login(): ...',
    },
    testResults: [],
    toolRegistry: harness.has_tool_registry
      ? ['read_file', 'write_file', 'run_tests']
      : [],
  };
}

/**
 * Convert a full legacy RunTrace to the new Trace format.
 */
export function traceToV2(
  runId: string,
  seed: number,
  status: 'SUCCESS' | 'FAILED',
  failureReason: string | null,
  totalTokens: number,
  steps: TraceStep[],
  harness: HarnessConfig,
  goal: string = 'Complete the task',
): Trace {
  let timestamp = 0;
  const events: AgentEvent[] = steps.map((step) => {
    timestamp +=
      step.action === 'THINK'
        ? 3000
        : step.action === 'EDIT_FILE'
          ? 2000
          : 1500;
    return stepToEvent(step, step.node || 'node_1', timestamp);
  });

  const stateSnapshots: StateSnapshot[] = steps.map((_, i) =>
    buildStateSnapshot(i + 1, goal, events.slice(0, i + 1)),
  );

  const contextSnapshots: ContextSnapshot[] = steps.map((step) =>
    buildContextSnapshot(step.step, harness, step.memory_used),
  );

  const environmentSnapshots: EnvironmentSnapshot[] = steps.map((step) =>
    buildEnvironmentSnapshot(step.step, harness),
  );

  return {
    traceId: runId,
    seed,
    status,
    failureReason,
    totalTokens,
    events,
    stateSnapshots,
    contextSnapshots,
    environmentSnapshots,
  };
}
