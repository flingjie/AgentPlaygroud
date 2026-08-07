import type { FailureReason, ReliabilityLayer, HarnessDim } from '../types';

// Ordered by layer (tool → workspace → memory → observation → loop_discipline → execution)
// Note: tool_registry, sandbox_isolation, permission_layer are in 'tool' layer
// state_persistence is in 'workspace' layer
// context_manager is in 'observation' layer (per controller decision)
// retry_policy is in 'loop_discipline' layer (gate, successRate=0)
// timeout_guard is in 'execution' layer

export const HARNESS_DIMS: HarnessDim[] = [
  {
    id: 'tool_registry',
    category: 'tool',
    nameKey: 'harness.toolRegistry',
    descKey: 'harness.toolRegistryDesc',
    effect: {
      successRate: 0.1,
      tokenCost: 0,
      prevents: ['HALLUCINATION'] as FailureReason[],
    },
  },
  {
    id: 'sandbox_isolation',
    category: 'tool',
    nameKey: 'harness.sandboxIsolation',
    descKey: 'harness.sandboxIsolationDesc',
    effect: {
      successRate: 0.1,
      tokenCost: 0,
      prevents: ['UNSAFE_EXECUTION'] as FailureReason[],
    },
    requires: ['tool_registry'],
  },
  {
    id: 'permission_layer',
    category: 'tool',
    nameKey: 'harness.permissionLayer',
    descKey: 'harness.permissionLayerDesc',
    effect: {
      successRate: 0.1,
      tokenCost: 0,
      prevents: ['PERMISSION_ERROR'] as FailureReason[],
    },
    requires: ['tool_registry'],
  },
  {
    id: 'state_persistence',
    category: 'workspace',
    nameKey: 'harness.statePersistence',
    descKey: 'harness.statePersistenceDesc',
    effect: {
      successRate: 0.1,
      tokenCost: 0,
      prevents: ['FILE_CORROSION'] as FailureReason[],
    },
  },
  {
    id: 'context_manager',
    category: 'observation',
    nameKey: 'harness.contextManager',
    descKey: 'harness.contextManagerDesc',
    effect: {
      successRate: 0.1,
      tokenCost: 0,
      prevents: ['STALE_CONTEXT', 'CONTEXT_OVERFLOW'] as FailureReason[],
    },
  },
  {
    id: 'retry_policy',
    category: 'loop_discipline',
    nameKey: 'harness.retryPolicy',
    descKey: 'harness.retryPolicyDesc',
    effect: {
      successRate: 0.0,
      tokenCost: 0,
      prevents: ['INFINITE_LOOP_TRAP', 'TASK_ABANDONED'] as FailureReason[],
    },
  },
  {
    id: 'timeout_guard',
    category: 'execution',
    nameKey: 'harness.timeoutGuard',
    descKey: 'harness.timeoutGuardDesc',
    effect: {
      successRate: 0.1,
      tokenCost: 0,
      prevents: ['BUDGET_EXHAUSTED'] as FailureReason[],
    },
  },
];

export const RELIABILITY_STACK: ReliabilityLayer[] = [
  { id: 'model', question: 'stack.layer.model.question', order: 0 },
  { id: 'tool', question: 'stack.layer.tool.question', order: 1 },
  { id: 'workspace', question: 'stack.layer.workspace.question', order: 2 },
  { id: 'memory', question: 'stack.layer.memory.question', order: 3 },
  { id: 'observation', question: 'stack.layer.observation.question', order: 4 },
  { id: 'loop_discipline', question: 'stack.layer.loop_discipline.question', order: 5 },
  { id: 'execution', question: 'stack.layer.execution.question', order: 6 },
];

export function dimById(id: string): HarnessDim | undefined {
  return HARNESS_DIMS.find((dim) => dim.id === id);
}
