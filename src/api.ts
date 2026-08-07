import type { AgentBlueprint, LevelInfo, MonteCarloResult, RunTrace, TraceStep } from './types';
import { simulateRun } from './simulator/runtimeSimulator';
import { simulateMonteCarlo } from './simulator/monteCarlo';

// ── Static Level Data ────────────────────────────────────────────────────────

const HARNESS_SEVEN_KEYS = [
  'tool_registry', 'retry_policy', 'timeout_guard',
  'sandbox_isolation', 'context_manager', 'state_persistence', 'permission_layer',
];

const LEVELS: LevelInfo[] = [
  { id: 'level_1_raw', name: 'Agent', description: 'A model alone is not an agent. With no harness, the runner cannot ground tools, persist work, or stop on real evidence.', learning_label: 'Raw LLM', unlocked_harness: [], unlocked_loop: false, unlocked_loop_stack: false, unlocked_loop_templates: [], unlocked_graph: false, target_success_rate: 0.08, token_budget: 10_000 },
  { id: 'level_2_harness', name: 'Agent + Harness', description: 'Same model, different harness — results diverge sharply. Unlock all seven dimensions. Still no loop, so a single failed test abandons the task.', learning_label: 'Tool Agent', unlocked_harness: [...HARNESS_SEVEN_KEYS], unlocked_loop: false, unlocked_loop_stack: false, unlocked_loop_templates: [], unlocked_graph: false, target_success_rate: 0.40, token_budget: 20_000 },
  { id: 'level_3_loop', name: 'Agent + Loop', description: 'Loop on evidence, not confidence. Configure trigger, goal, state/action policy, evidence, feedback, and stop rules. Loop engineering != prompt engineering.', learning_label: 'Single Loop', unlocked_harness: [...HARNESS_SEVEN_KEYS], unlocked_loop: true, unlocked_loop_stack: false, unlocked_loop_templates: [], unlocked_graph: false, target_success_rate: 0.70, token_budget: 50_000 },
  { id: 'level_4_loop_stack', name: 'Agent + Loop Stack', description: 'Two loops can cooperate or fight. Pick a template: a single verification loop, or a verification loop nested inside an improvement loop.', learning_label: 'Loop Stack', unlocked_harness: [...HARNESS_SEVEN_KEYS], unlocked_loop: true, unlocked_loop_stack: true, unlocked_loop_templates: ['single', 'dual'], unlocked_graph: false, target_success_rate: 0.80, token_budget: 80_000 },
  { id: 'level_5_graph', name: 'Agent + Graph', description: 'The graph decides who runs next — not what the agent does. Conditional edges route control flow; failure states must always have a recovery path.', learning_label: 'Agent Graph', unlocked_harness: [...HARNESS_SEVEN_KEYS], unlocked_loop: true, unlocked_loop_stack: true, unlocked_loop_templates: ['single', 'dual'], unlocked_graph: true, target_success_rate: 0.90, token_budget: 120_000 },
  { id: 'level_6_agent_system', name: 'Agent System', description: 'Plan → Build → Test → Review → Release. Combine the full harness, a factory loop template, and export the blueprint as real code.', learning_label: 'Agent Factory', unlocked_harness: [...HARNESS_SEVEN_KEYS], unlocked_loop: true, unlocked_loop_stack: true, unlocked_loop_templates: ['factory'], unlocked_graph: true, target_success_rate: 0.95, token_budget: 200_000 },
];

// ── API Functions ────────────────────────────────────────────────────────────

export async function getLevels(): Promise<LevelInfo[]> {
  return [...LEVELS];
}

export async function simulate(blueprint: AgentBlueprint): Promise<RunTrace> {
  const seed = blueprint.run_seed ?? 42;
  return simulateRun(
    {
      harness: blueprint.harness,
      loop: blueprint.loop,
      loopStack: blueprint.loop_stack,
      graph: blueprint.graph,
    },
    seed,
  );
}

export async function monteCarlo(
  blueprint: AgentBlueprint,
  numRuns: number = 100,
): Promise<MonteCarloResult> {
  const seed = blueprint.run_seed ?? 42;
  const result = simulateMonteCarlo(
    {
      harness: blueprint.harness,
      loop: blueprint.loop,
      loopStack: blueprint.loop_stack,
      graph: blueprint.graph,
    },
    seed,
    Math.min(numRuns, 100),
  );
  return {
    ...result,
    success_rate: Math.round(result.success_rate * 10000) / 100,
  };
}

export function connectSimulationWebSocket(
  _runId: string,
  trace: RunTrace,
  onStep: (step: TraceStep) => void,
  onComplete: (trace: RunTrace) => void,
): WebSocket {
  const fakeWs = {
    close: () => {
      if (fakeWs._timer) clearTimeout(fakeWs._timer);
    },
    _timer: 0 as ReturnType<typeof setTimeout> | 0,
  };

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
