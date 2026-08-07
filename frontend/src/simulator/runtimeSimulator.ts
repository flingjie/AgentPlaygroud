import type {
  SimConfig,
  HarnessConfig,
  LoopConfig,
  LoopStackConfig,
  GraphSpec,
  GraphNode,
  GraphEdge,
  TraceStep,
  RunTrace,
  FailureReason,
  TraceAction,
} from '../types';
import type { SeededRng as SeededRngType } from './rng';
import {
  ACTION_COST,
  checkStepFailure,
  checkCrossCutFailure,
  staleLag,
  wouldFalseComplete,
  wouldTrapNoRetry,
  wouldAbandon,
  budgetExceeded,
  hasStructuralDeadlock,
  checkpointRecoveryChance,
  harnessQuality,
} from './failureEngine';
import { SeededRng } from './rng';

// Use type alias to reference the value as a type
type SeededRng = SeededRngType;

// ==================== Topology ====================
/**
 * Topology info computed from graph structure.
 */
export interface TopologyInfo {
  kind: 'single' | 'chain' | 'parallel' | 'feedback';
  hasFeedback: boolean;
  parallelCoders: number;
  isolatedNodes: string[];
}

/**
 * Internal step context for loop simulation.
 */
interface LoopStepContext {
  attempt: number;
  harnessQuality: number;
  goalBonus: number;
  actionBonus: number;
  hasEvidence: boolean;
  useReflexion: boolean;
  useCompact: boolean;
  maxRetries: number;
}

// ==================== Reflection Keys ====================

const REFLECTION_KEYS = [
  'reflect_test_fail',
  'reflect_wrong_file',
  'reflect_off_by_one',
  'reflect_dependency',
];

/**
 * Map a FailureReason to the kebab-case warning string used on FAILED steps.
 * (e.g. 'HALLUCINATION' -> 'hallucination', 'MEMORY_STACK_OVERFLOW' -> 'memory_stack_overflow')
 */
function reasonToWarning(reason: string): string {
  return reason.toLowerCase();
}

// ==================== Core Simulation Function ====================

/**
 * Run a single simulation and return the trace.
 * Deterministic: same config + seed produces identical output.
 */
export function simulateRun(config: SimConfig, seed: number): RunTrace {
  const { harness, loop, loopStack = { enabled: false, template: 'none' }, graph = defaultGraph() } = config;

  // Create RNG from seed
  const rng = new SeededRng(seed);

  // Generate runId from RNG
  const runId = `sim_${rng.int(100000, 999999)}`;

  // Effective graph - default to single coder if no nodes
  const effectiveGraph = graph;
  const nodes = effectiveGraph.nodes && effectiveGraph.nodes.length > 0
    ? effectiveGraph.nodes
    : [{ id: 'node_1', role: 'coder' as const, state_writes: [] }];
  const entry = effectiveGraph.entry ?? nodes[0].id;

  // Analyze topology
  const topology = analyzeTopology(nodes, effectiveGraph.edges);
  const nodeOrder = resolveNodeOrder(nodes, effectiveGraph.edges, entry);

  // Compute metrics
  const hq = harnessQuality(harness);
  const graphBonus = hasGraphBonus(nodes);
  const numNodes = nodeOrder.length;
  const multiAgent = numNodes > 1 && graphBonus;

  let coderEditCount = 0;
  const hasLoop = loop.enabled;
  const hasTester = nodeOrder.some(n => n.role === 'tester');
  const graphHasReviewer = nodeOrder.some(n => n.role === 'reviewer');
  const parallelCoderIdSet = parallelCoderIds(nodes, effectiveGraph.edges, topology);
  const schemaSurcharge = effectiveGraph.state_schema?.length ?? 0;

  // Steps and costs
  const steps: TraceStep[] = [];
  let globalMemory = 0;
  let costTokens = 0;
  let failureReason: FailureReason = 'NONE';
  let stepCount = 0;

  // Helper to add a step
  function addStep(nodeId: string, action: TraceAction, memoryUsed: number, status: 'SUCCESS' | 'FAIL' = 'SUCCESS', warning?: string, reflection?: string): number {
    stepCount++;
    const step: TraceStep = {
      step: stepCount,
      node: nodeId,
      action,
      status,
      memoryUsed,
      warning,
      reflection,
      costTokens: ACTION_COST[action],
    };
    steps.push(step);
    return ACTION_COST[action];
  }

  // Helper to compute memory cost per action
  function memoryCost(action: TraceAction, capacity: number, current: number): number {
    const base: Record<TraceAction, number> = {
      THINK: 1,
      EDIT_FILE: 2,
      RUN_TEST: 1,
      RETRY: 1,
      CHECK_EVIDENCE: 1,
      STOP: 0,
    };
    const cost = base[action] ?? 1;
    if (current < capacity) {
      return Math.min(cost, capacity - current);
    }
    return cost;
  }

  // ==================== DEADLOCK Short-Circuit ====================
  if (failureReason === 'NONE' && hasStructuralDeadlock(effectiveGraph)) {
    failureReason = 'DEADLOCK';
    const entryNode = nodeOrder[0].id;
    costTokens += addStep(entryNode, 'STOP', globalMemory, 'FAIL', 'deadlock');
    return {
      runId,
      seed,
      status: 'FAILED',
      failureReason,
      costTokens,
      topology,
      steps,
    };
  }

  // ==================== Simulate Each Node in Order ====================
  for (const node of nodeOrder) {
    const { stepSteps, stepMemory, stepTokens, stepFailure } = simulateNode(
      node,
      harness,
      loop,
      hq,
      graphBonus,
      multiAgent,
      globalMemory,
      coderEditCount,
      schemaSurcharge,
      rng,
      steps,
      effectiveGraph.state_schema?.length ?? 0,
    );

    for (const s of stepSteps) {
      s.step = steps.length + 1;
      steps.push(s);
    }

    if (multiAgent) {
      globalMemory = Math.max(globalMemory, stepMemory);
    } else {
      globalMemory += stepMemory;
    }
    costTokens += stepTokens;

    if (node.role === 'coder') {
      coderEditCount += stepSteps.filter(s => s.action === 'EDIT_FILE').length;
    }

    // Parallel coder rescue check
    if (
      node.role === 'coder' &&
      parallelCoderIdSet.has(node.id) &&
      stepFailure !== 'NONE'
    ) {
      let siblingOk = false;
      for (const sibId of parallelCoderIdSet) {
        if (sibId === node.id) continue;
        const sibSteps = steps.filter(
          s => s.node === sibId && s.action === 'EDIT_FILE'
        );
        if (sibSteps.length > 0 && sibSteps.every(s => s.status === 'SUCCESS')) {
          siblingOk = true;
          break;
        }
      }
      if (siblingOk) {
        stepFailure = 'NONE';
      }
    }

    if (failureReason === 'NONE' && stepFailure !== 'NONE') {
      failureReason = stepFailure;
    }
  }

  // Parallel coder cross-cut rescue
  if (
    parallelCoderIdSet.size > 0 &&
    failureReason !== 'NONE' &&
    (failureReason === 'HALLUCINATION' ||
      failureReason === 'FILE_CORROSION' ||
      failureReason === 'MEMORY_STACK_OVERFLOW' ||
      failureReason === 'CONTEXT_OVERFLOW')
  ) {
    let anyClean = false;
    for (const cid of parallelCoderIdSet) {
      const edits = steps.filter(s => s.node === cid && s.action === 'EDIT_FILE');
      if (edits.length > 0 && edits.every(s => s.status === 'SUCCESS')) {
        anyClean = true;
        break;
      }
    }
    if (anyClean) {
      failureReason = 'NONE';
    }
  }

  // Cross-cut failures
  if (failureReason === 'NONE') {
    const crossFailure = checkCrossCutFailureInternal(
      harness,
      steps,
      globalMemory,
      coderEditCount,
      rng
    );
    if (crossFailure !== 'NONE') {
      failureReason = crossFailure;
    }
  }

  // Test node ID (for loop steps)
  const lastNodeId = nodeOrder[nodeOrder.length - 1]?.id ?? 'node_1';
  const testerNode = nodeOrder.find(n => n.role === 'tester');
  const testNodeId = testerNode?.id ?? lastNodeId;

  // ==================== Loop / Test Simulation ====================
  if (failureReason === 'NONE' && hasLoop) {
    // Loop-stack templates
    if (loopStack.enabled && (loopStack.template === 'dual' || loopStack.template === 'factory')) {
      const { loopFailure, loopSteps, loopTokens } = simulateLoopStack(
        loopStack,
        harness,
        loop,
        hq,
        graphHasReviewer,
        globalMemory,
        testNodeId,
        rng,
        steps,
        costTokens,
        effectiveGraph.state_schema?.length ?? 0
      );
      for (const s of loopSteps) {
        s.step = steps.length + 1;
        steps.push(s);
      }
      costTokens += loopTokens;
      failureReason = loopFailure;
    } else if (!harness.has_retry_policy) {
      // Loop enabled but no retry mechanism
      failureReason = 'INFINITE_LOOP_TRAP';
      costTokens += addStep(testNodeId, 'RETRY', globalMemory, 'FAIL', 'no_retry_mechanism');
    } else if (loop.stop_on === 'agent_says_done') {
      // Ungrounded stop path
      let evidenceOk = false;
      if (loop.evidence !== 'none') {
        const threshold = Math.max(0.1, 0.55 - hq);
        evidenceOk = rng.next() > threshold;
      }

      if (loop.evidence !== 'none') {
        costTokens += addStep(testNodeId, 'CHECK_EVIDENCE', globalMemory, evidenceOk ? 'SUCCESS' : 'FAIL', evidenceOk ? undefined : 'false_completion');
      }

      if (loop.evidence !== 'none' && evidenceOk) {
        // Evidence passed, but still often ungrounded
        if (rng.next() < 0.7) {
          failureReason = 'FALSE_COMPLETION';
          costTokens += addStep(testNodeId, 'STOP', globalMemory, 'FAIL', 'false_completion');
        } else {
          costTokens += addStep(testNodeId, 'STOP', globalMemory, 'SUCCESS');
        }
      } else {
        failureReason = 'FALSE_COMPLETION';
        costTokens += addStep(testNodeId, 'STOP', globalMemory, 'FAIL', 'false_completion');
      }
    } else {
      // evidence_pass or budget_or_max
      const { loopOk, retriesUsed } = simulateLoop(
        loop,
        hq,
        graphHasReviewer,
        rng
      );

      // Action policy cost
      if (loop.action_policy === 'edit_then_retest') {
        costTokens += ACTION_COST.EDIT_FILE * retriesUsed;
      }

      // Context overflow check
      const ctxRisk = contextFullRisk(loop.state_policy);
      if (ctxRisk > 0 && rng.next() < ctxRisk) {
        failureReason = 'CONTEXT_OVERFLOW';
        costTokens += addStep(testNodeId, 'RETRY', globalMemory, 'FAIL', 'context_overflow');
      } else if (!loopOk) {
        // Loop exhausted
        if (topology.hasFeedback) {
          // Try feedback rework
          const rescued = feedbackRework(
            nodeOrder,
            harness,
            hq,
            globalMemory,
            testNodeId,
            steps,
            costTokens,
            topology,
            rng
          );
          if (rescued) {
            failureReason = 'NONE';
            costTokens += addStep(testNodeId, 'STOP', globalMemory, 'SUCCESS');
          } else {
            failureReason = 'INFINITE_LOOP_TRAP';
            costTokens += addStep(testNodeId, 'RETRY', globalMemory, 'FAIL', 'infinite_loop');
          }
        } else {
          failureReason = 'INFINITE_LOOP_TRAP';
          costTokens += addStep(testNodeId, 'RETRY', globalMemory, 'FAIL', 'infinite_loop');
        }
      } else {
        // Loop success
        for (let r = 0; r < retriesUsed; r++) {
          const action = r === 0 ? 'RUN_TEST' : 'RETRY';
          const reflection = (loop.evidence !== 'none' && loop.feedback === 'reflexion')
            ? REFLECTION_KEYS[(r - 1) % REFLECTION_KEYS.length]
            : undefined;
          costTokens += addStep(testNodeId, action, globalMemory, 'SUCCESS', undefined, reflection);
        }

        if (loop.evidence !== 'none') {
          costTokens += addStep(testNodeId, 'CHECK_EVIDENCE', globalMemory, 'SUCCESS');
        }

        if (loop.trigger === 'on_task_start') {
          // Extra CHECK_EVIDENCE overhead
          costTokens += ACTION_COST.CHECK_EVIDENCE;
        }

        costTokens += addStep(testNodeId, 'STOP', globalMemory, 'SUCCESS');
      }
    }
  } else if (failureReason === 'NONE' && !hasLoop) {
    // No loop - single test attempt
    const testPass = rng.next() > Math.max(0.1, 0.7 - hq);
    if (testPass) {
      costTokens += addStep(testNodeId, 'RUN_TEST', globalMemory, 'SUCCESS');
    } else {
      let abandoned = true;
      if (hasTester) {
        // Retest with tester
        const retestPass = rng.next() > Math.max(0.1, 0.55 - hq);
        costTokens += addStep(testNodeId, 'RUN_TEST', globalMemory, retestPass ? 'SUCCESS' : 'FAIL', retestPass ? undefined : 'task_abandoned');

        if (retestPass) {
          abandoned = false;
          costTokens += addStep(testNodeId, 'RUN_TEST', globalMemory, 'SUCCESS');
        }
      } else {
        costTokens += addStep(testNodeId, 'RUN_TEST', globalMemory, 'FAIL', 'task_abandoned');
      }

      if (abandoned) {
        // Try feedback rework rescue
        if (topology.hasFeedback) {
          const rescued = feedbackRework(
            nodeOrder,
            harness,
            hq,
            globalMemory,
            testNodeId,
            steps,
            costTokens,
            topology,
            rng
          );
          if (rescued) {
            failureReason = 'NONE';
          } else if (effectiveGraph.checkpointing && rng.next() < checkpointRecoveryChance(effectiveGraph.state_schema?.length ?? 0)) {
            // Checkpointing recovery
            failureReason = 'NONE';
            costTokens += addStep(testNodeId, 'RUN_TEST', globalMemory, 'SUCCESS');
          } else {
            failureReason = 'TASK_ABANDONED';
          }
        } else if (effectiveGraph.checkpointing && rng.next() < checkpointRecoveryChance(effectiveGraph.state_schema?.length ?? 0)) {
          // Checkpointing recovery
          failureReason = 'NONE';
          costTokens += addStep(testNodeId, 'RUN_TEST', globalMemory, 'SUCCESS');
        } else {
          failureReason = 'TASK_ABANDONED';
        }
      }
    }
  }

  // ==================== Final Budget Check ====================
  if (failureReason === 'NONE' && budgetExceeded(harness, costTokens)) {
    failureReason = 'BUDGET_EXHAUSTED';
    costTokens += addStep(testNodeId, 'STOP', globalMemory, 'FAIL', 'budget_exhausted');
  }

  return {
    runId,
    seed,
    status: failureReason === 'NONE' ? 'SUCCESS' : 'FAILED',
    failureReason,
    costTokens,
    topology,
    steps,
  };
}

// ==================== Node Simulation ====================

function simulateNode(
  node: GraphNode,
  harness: HarnessConfig,
  loop: LoopConfig,
  hq: number,
  graphBonus: boolean,
  multiAgent: boolean,
  globalMemory: number,
  coderEditCount: number,
  schemaSurcharge: number,
  rng: SeededRng,
  stepsSoFar: TraceStep[],
  stateSchemaLen: number
): { stepSteps: TraceStep[]; stepMemory: number; stepTokens: number; stepFailure: FailureReason } {
  const steps: TraceStep[] = [];
  let memoryDelta = 0;
  let tokens = 0;
  let failure: FailureReason = 'NONE';
  const capacity = harness.memory_capacity;

  // Local memory tracking
  let localMemory = schemaSurcharge;

  const addStep = (action: TraceAction, status: 'SUCCESS' | 'FAIL' = 'SUCCESS', warning?: string, reflection?: string): number => {
    const stepMemory = localMemory;
    const stepTokens = ACTION_COST[action];
    const step: TraceStep = {
      step: 0, // Will be set later
      node: node.id,
      action,
      status,
      memoryUsed: stepMemory,
      warning,
      reflection,
      costTokens: stepTokens,
    };
    steps.push(step);
    return stepTokens;
  };

  const computeMemoryCost = (action: TraceAction): number => {
    const base: Record<TraceAction, number> = {
      THINK: 1,
      EDIT_FILE: 2,
      RUN_TEST: 1,
      RETRY: 1,
      CHECK_EVIDENCE: 1,
      STOP: 0,
    };
    const cost = base[action] ?? 1;
    if (localMemory < capacity) {
      return Math.min(cost, capacity - localMemory);
    }
    return cost;
  };

  if (node.role === 'planner') {
    const planCount = graphBonus ? 2 : 1;
    for (let i = 0; i < planCount; i++) {
      tokens += addStep('THINK');
      const cost = computeMemoryCost('THINK');
      localMemory += cost + schemaSurcharge;
      memoryDelta = localMemory;
    }
  } else if (node.role === 'coder') {
    // First THINK step
    tokens += addStep('THINK');
    const cost = computeMemoryCost('THINK');
    localMemory += cost + schemaSurcharge;
    memoryDelta = localMemory;

    // First EDIT_FILE with failure check
    const memForCheck = multiAgent ? localMemory : globalMemory + localMemory;
    const stale = staleLag(stepsSoFar, 1);
    const hasGroundedLoop = loop.enabled && loop.evidence !== 'none';
    const checkFailure = checkStepFailure(
      {
        harness,
        loop,
        nodeRole: 'coder',
        stepCount: stepsSoFar.length + steps.length + 1,
        coderEdits: coderEditCount + 1,
        memoryUsed: memForCheck,
        staleLag: stale,
        hasGroundedLoop,
      },
      rng
    );

    if (checkFailure) {
      tokens += addStep('EDIT_FILE', 'FAIL', reasonToWarning(checkFailure));
      if (failure === 'NONE') {
        failure = checkFailure;
      }
    } else {
      tokens += addStep('EDIT_FILE', 'SUCCESS');
    }

    // Second EDIT_FILE chance
    if (rng.next() < 0.4 + hq * 0.3 && failure === 'NONE') {
      const editCount = coderEditCount + 2;
      const memForCheck2 = multiAgent ? localMemory : globalMemory + localMemory;
      const stale2 = staleLag(stepsSoFar, 2);
      const checkFailure2 = checkStepFailure(
        {
          harness,
          loop,
          nodeRole: 'coder',
          stepCount: stepsSoFar.length + steps.length + 1,
          coderEdits: editCount,
          memoryUsed: memForCheck2,
          staleLag: stale2,
          hasGroundedLoop,
        },
        rng
      );

      if (checkFailure2) {
        tokens += addStep('EDIT_FILE', 'FAIL', reasonToWarning(checkFailure2));
        if (failure === 'NONE') {
          failure = checkFailure2;
        }
      } else {
        tokens += addStep('EDIT_FILE', 'SUCCESS');
      }
    }

    memoryDelta = localMemory;
  } else if (node.role === 'reviewer') {
    tokens += addStep('THINK');
    const cost = computeMemoryCost('THINK');
    localMemory += cost + schemaSurcharge;
    memoryDelta = localMemory;

    const fixChance = graphBonus ? 0.7 : 0.3;
    if (rng.next() < fixChance) {
      tokens += addStep('EDIT_FILE', 'SUCCESS');
      memoryDelta = localMemory;
    }
  } else if (node.role === 'tester') {
    tokens += addStep('RUN_TEST', 'SUCCESS');
    memoryDelta = localMemory;
  }

  return { stepSteps: steps, stepMemory: memoryDelta, stepTokens: tokens, stepFailure: failure };
}

// ==================== Topology Analysis ====================

function analyzeTopology(nodes: GraphNode[], edges: GraphEdge[] = []): TopologyInfo {
  if (!nodes || nodes.length === 0) {
    return { kind: 'single', hasFeedback: false, parallelCoders: 0, isolatedNodes: [] };
  }
  if (nodes.length === 1) {
    return { kind: 'single', hasFeedback: false, parallelCoders: 0, isolatedNodes: [] };
  }

  // Build adjacency lists
  const outgoing: Record<string, string[]> = {};
  const incoming: Record<string, string[]> = {};
  const nodeIds = new Set<string>();

  for (const node of nodes) {
    nodeIds.add(node.id);
    outgoing[node.id] = [];
    incoming[node.id] = [];
  }

  for (const edge of edges) {
    if (outgoing[edge.source] && incoming[edge.target]) {
      outgoing[edge.source].push(edge.target);
      incoming[edge.target].push(edge.source);
    }
  }

  // Find isolated nodes (no incoming and no outgoing)
  const isolated: string[] = [];
  for (const node of nodes) {
    if (outgoing[node.id].length === 0 && incoming[node.id].length === 0) {
      isolated.push(node.id);
    }
  }

  const connectedNodes = nodes.filter(n => !isolated.includes(n.id));
  if (connectedNodes.length <= 1) {
    return { kind: 'single', hasFeedback: false, parallelCoders: 0, isolatedNodes: [] };
  }

  // Check for feedback conditions
  let hasFeedback = hasCycle(nodes, edges);
  if (!hasFeedback) {
    for (const edge of edges) {
      if (edge.condition === 'on_fail' || edge.condition === 'on_review_reject') {
        hasFeedback = true;
        break;
      }
    }
  }
  if (!hasFeedback) {
    for (const edge of edges) {
      const src = nodes.find(n => n.id === edge.source);
      const tgt = nodes.find(n => n.id === edge.target);
      if (src && tgt && src.role === 'reviewer' && (tgt.role === 'coder' || tgt.role === 'planner')) {
        hasFeedback = true;
        break;
      }
    }
  }

  // Find parallel coders
  const coders = nodes.filter(n => n.role === 'coder');
  let parallelCoders = 0;
  if (coders.length >= 2) {
    const roots = coders.filter(n => incoming[n.id].length === 0);
    if (roots.length >= 2) {
      parallelCoders = roots.length;
    } else {
      const predGroups: Record<string, string[]> = {};
      for (const c of coders) {
        const preds = incoming[c.id].slice().sort((a, b) => a.localeCompare(b)).toString();
        if (!predGroups[preds]) predGroups[preds] = [];
        predGroups[preds].push(c.id);
      }
      for (const group of Object.values(predGroups)) {
        if (group.length >= 2) {
          parallelCoders = Math.max(parallelCoders, group.length);
        }
      }
    }
  }

  let kind: TopologyInfo['kind'];
  if (hasFeedback) {
    kind = 'feedback';
  } else if (parallelCoders >= 2) {
    kind = 'parallel';
  } else {
    kind = 'chain';
  }

  return {
    kind,
    hasFeedback,
    parallelCoders,
    isolatedNodes: isolated,
  };
}

// ==================== Cycle Detection (DFS) ====================

function hasCycle(nodes: GraphNode[], edges: GraphEdge[]): boolean {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;

  const color: Record<string, number> = {};
  const outgoing: Record<string, string[]> = {};

  for (const node of nodes) {
    color[node.id] = WHITE;
    outgoing[node.id] = [];
  }

  for (const edge of edges) {
    if (outgoing[edge.source]) {
      outgoing[edge.source].push(edge.target);
    }
  }

  function dfs(uid: string): boolean {
    color[uid] = GRAY;
    for (const nxt of outgoing[uid] || []) {
      if (color[nxt] === GRAY) return true;
      if (color[nxt] === WHITE && dfs(nxt)) return true;
    }
    color[uid] = BLACK;
    return false;
  }

  for (const node of nodes) {
    if (color[node.id] === WHITE && dfs(node.id)) {
      return true;
    }
  }
  return false;
}

// ==================== Node Order Resolution ====================

function resolveNodeOrder(nodes: GraphNode[], edges: GraphEdge[] = [], entry: string | null = null): GraphNode[] {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  const outgoing: Record<string, string[]> = {};
  const incoming: Record<string, string[]> = {};
  const nodeMap: Record<string, GraphNode> = {};

  for (const node of nodes) {
    nodeMap[node.id] = node;
    outgoing[node.id] = [];
    incoming[node.id] = [];
  }

  for (const edge of edges) {
    if (outgoing[edge.source] && incoming[edge.target]) {
      outgoing[edge.source].push(edge.target);
      incoming[edge.target].push(edge.source);
    }
  }

  let roots: GraphNode[] = [];
  if (entry && nodeMap[entry]) {
    roots = [nodeMap[entry]];
  } else {
    roots = nodes.filter(n => incoming[n.id].length === 0);
    if (roots.length === 0) {
      roots = [nodes[0]];
    }
  }

  const order: GraphNode[] = [];
  const visited = new Set<string>();

  function walk(n: GraphNode) {
    if (visited.has(n.id)) return;
    visited.add(n.id);
    order.push(n);
    for (const nxtId of outgoing[n.id]) {
      if (nodeMap[nxtId] && !visited.has(nxtId)) {
        walk(nodeMap[nxtId]);
      }
    }
  }

  for (const root of roots) {
    walk(root);
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      order.push(node);
    }
  }

  return order;
}

// ==================== Parallel Coder IDs ====================

function parallelCoderIds(nodes: GraphNode[], edges: GraphEdge[], topology: TopologyInfo): Set<string> {
  if (topology.parallelCoders < 2) {
    return new Set();
  }
  const coders = nodes.filter(n => n.role === 'coder');
  if (coders.length < 2) {
    return new Set();
  }

  const incoming: Record<string, string[]> = {};
  for (const node of nodes) {
    incoming[node.id] = [];
  }
  for (const edge of edges) {
    if (incoming[edge.target]) {
      incoming[edge.target].push(edge.source);
    }
  }

  const roots = coders.filter(n => incoming[n.id].length === 0);
  if (roots.length >= 2) {
    return new Set(roots.map(n => n.id));
  }

  const predGroups: Record<string, string[]> = {};
  for (const c of coders) {
    const preds = incoming[c.id].slice().sort((a, b) => a.localeCompare(b)).toString();
    if (!predGroups[preds]) predGroups[preds] = [];
    predGroups[preds].push(c.id);
  }
  for (const group of Object.values(predGroups)) {
    if (group.length >= 2) {
      return new Set(group);
    }
  }
  return new Set(coders.map(n => n.id));
}

// ==================== Graph Bonus ====================

function hasGraphBonus(nodes: GraphNode[]): boolean {
  if (nodes.length < 3) return false;
  const roles = new Set(nodes.map(n => n.role));
  return roles.has('planner') && roles.has('coder') && roles.has('reviewer');
}

// ==================== Context Full Risk ====================

function contextFullRisk(statePolicy: LoopConfig['state_policy']): number {
  if (statePolicy === 'stateless') return 0.2;
  if (statePolicy === 'keep_last_error') return 0.55;
  if (statePolicy === 'keep_run_summary') return 0.75;
  return 0;
}

// ==================== Loop Simulation ====================

function simulateLoop(
  loop: LoopConfig,
  hq: number,
  graphHasReviewer: boolean,
  rng: SeededRng
): { loopOk: boolean; retriesUsed: number } {
  const maxRetries = loop.max_iterations;
  const hasEvidence = loop.evidence !== 'none';
  const useReflexion = hasEvidence && loop.feedback === 'reflexion';
  const useCompact = hasEvidence && loop.feedback === 'compact_error';

  // Goal/bonus calculation
  let goalBonus = 0;
  if (loop.goal === 'tests_green' && loop.evidence === 'test_runner') {
    goalBonus = 0.05;
  } else if (loop.goal === 'schema_valid' && loop.evidence === 'schema_check') {
    goalBonus = 0.05;
  }

  // Action bonus
  let actionBonus = 0;
  if (loop.action_policy === 'edit_then_retest') {
    actionBonus = 0.10;
  } else if (loop.action_policy === 'escalate_review') {
    if (!graphHasReviewer) {
      return { loopOk: false, retriesUsed: maxRetries };
    }
    actionBonus = 0.05;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let errorRate: number;
    if (!hasEvidence) {
      errorRate = Math.max(0.1, 0.8 - hq);
    } else if (useReflexion) {
      errorRate = Math.max(0.1, 0.8 - (attempt * 0.25) - hq - goalBonus - actionBonus);
    } else if (useCompact) {
      errorRate = Math.max(0.1, 0.8 - (attempt * 0.12) - hq - goalBonus - actionBonus);
    } else {
      errorRate = Math.max(0.1, 0.8 - (attempt * 0.05) - hq - goalBonus - actionBonus);
    }

    if (rng.next() > errorRate) {
      return { loopOk: true, retriesUsed: attempt + 1 };
    }
  }
  return { loopOk: false, retriesUsed: maxRetries };
}

// ==================== Loop Stack Simulation ====================

function simulateLoopStack(
  loopStack: LoopStackConfig,
  harness: HarnessConfig,
  loop: LoopConfig,
  hq: number,
  graphHasReviewer: boolean,
  globalMemory: number,
  testNodeId: string,
  rng: SeededRng,
  steps: TraceStep[],
  costTokens: number,
  stateSchemaLen: number
): { loopFailure: FailureReason; loopSteps: TraceStep[]; loopTokens: number } {
  const loopSteps: TraceStep[] = [];
  let loopCost = 0;

  if (!harness.has_retry_policy) {
    const s: TraceStep = {
      step: 0,
      node: testNodeId,
      action: 'RETRY',
      status: 'FAIL',
      memoryUsed: globalMemory,
      warning: 'no_retry_mechanism',
      costTokens: ACTION_COST.RETRY,
    };
    loopSteps.push(s);
    loopCost += ACTION_COST.RETRY;
    return { loopFailure: 'INFINITE_LOOP_TRAP', loopSteps, loopTokens: loopCost };
  }

  if (loopStack.template === 'factory') {
    const stages = ['planner', 'coder', 'tester', 'reviewer'];
    let stageMemory = globalMemory + 1;

    for (let i = 0; i < stages.length; i++) {
      const role = stages[i];
      const failed = rng.next() <= Math.max(0.05, 0.25 - hq * 0.2);
      stageMemory += 1;

      let warning: string | undefined;
      if (failed && i === 2) {
        warning = 'false_completion';
      } else if (failed) {
        warning = 'task_abandoned';
      }

      const s: TraceStep = {
        step: 0,
        node: `stage_${role}`,
        action: 'RUN_TEST',
        status: failed ? 'FAIL' : 'SUCCESS',
        memoryUsed: stageMemory,
        warning,
        costTokens: ACTION_COST.RUN_TEST,
      };
      loopSteps.push(s);
      loopCost += ACTION_COST.RUN_TEST;

      if (failed) {
        if (i === 2) {
          return { loopFailure: 'FALSE_COMPLETION', loopSteps, loopTokens: loopCost };
        }
        return { loopFailure: 'TASK_ABANDONED', loopSteps, loopTokens: loopCost };
      }
    }

    loopSteps.push({
      step: 0,
      node: 'release',
      action: 'STOP',
      status: 'SUCCESS',
      memoryUsed: stageMemory,
      costTokens: ACTION_COST.STOP,
    });
    loopCost += ACTION_COST.STOP + ACTION_COST.CHECK_EVIDENCE;
    return { loopFailure: 'NONE', loopSteps, loopTokens: loopCost };
  }

  // Dual template: inner verify loop (max 3), outer improve loop (max 5)
  const innerLoop: LoopConfig = {
    enabled: true,
    trigger: 'on_task_start',
    goal: 'tests_green',
    state_policy: 'stateless',
    action_policy: 'edit_then_retest',
    evidence: 'test_runner',
    feedback: 'reflexion',
    stop_on: 'evidence_pass',
    max_iterations: 3,
  };

  const outerLoop: LoopConfig = {
    enabled: true,
    trigger: 'on_task_start',
    goal: 'schema_valid',
    state_policy: 'keep_run_summary',
    action_policy: 'escalate_review',
    evidence: 'reviewer_signoff',
    feedback: 'compact_error',
    stop_on: 'budget_or_max',
    max_iterations: 5,
  };

  // Inner verify loop
  const { loopOk: innerOk, retriesUsed: innerUsed } = simulateLoop(innerLoop, hq, graphHasReviewer, rng);
  for (let i = 0; i < innerUsed; i++) {
    const s: TraceStep = {
      step: 0,
      node: testNodeId,
      action: 'RETRY',
      status: 'SUCCESS',
      memoryUsed: globalMemory,
      costTokens: ACTION_COST.RETRY,
    };
    loopSteps.push(s);
    loopCost += ACTION_COST.RETRY;
  }
  if (!innerOk) {
    const s: TraceStep = {
      step: 0,
      node: testNodeId,
      action: 'RETRY',
      status: 'FAIL',
      memoryUsed: globalMemory,
      warning: 'infinite_loop',
      costTokens: ACTION_COST.RETRY,
    };
    loopSteps.push(s);
    loopCost += ACTION_COST.RETRY;
    return { loopFailure: 'INFINITE_LOOP_TRAP', loopSteps, loopTokens: loopCost };
  }

  // Outer improve loop
  const { loopOk: outerOk, retriesUsed: outerUsed } = simulateLoop(outerLoop, hq, graphHasReviewer, rng);
  for (let i = 0; i < outerUsed; i++) {
    const s: TraceStep = {
      step: 0,
      node: testNodeId,
      action: 'RETRY',
      status: 'SUCCESS',
      memoryUsed: globalMemory,
      costTokens: ACTION_COST.RETRY,
    };
    loopSteps.push(s);
    loopCost += ACTION_COST.RETRY;
  }
  if (!outerOk) {
    const s: TraceStep = {
      step: 0,
      node: testNodeId,
      action: 'RETRY',
      status: 'FAIL',
      memoryUsed: globalMemory,
      warning: 'infinite_loop',
      costTokens: ACTION_COST.RETRY,
    };
    loopSteps.push(s);
    loopCost += ACTION_COST.RETRY;
    return { loopFailure: 'INFINITE_LOOP_TRAP', loopSteps, loopTokens: loopCost };
  }

  loopSteps.push({
    step: 0,
    node: testNodeId,
    action: 'CHECK_EVIDENCE',
    status: 'SUCCESS',
    memoryUsed: globalMemory,
    costTokens: ACTION_COST.CHECK_EVIDENCE,
  });
  loopCost += ACTION_COST.CHECK_EVIDENCE;

  loopSteps.push({
    step: 0,
    node: testNodeId,
    action: 'STOP',
    status: 'SUCCESS',
    memoryUsed: globalMemory,
    costTokens: ACTION_COST.STOP,
  });
  loopCost += ACTION_COST.STOP;

  return { loopFailure: 'NONE', loopSteps, loopTokens: loopCost };
}

// ==================== Feedback Rework ====================

function feedbackRework(
  nodeOrder: GraphNode[],
  harness: HarnessConfig,
  hq: number,
  globalMemory: number,
  testNodeId: string,
  stepsSoFar: TraceStep[],
  currentTokens: number,
  topology: TopologyInfo,
  rng: SeededRng
): boolean {
  const coder = nodeOrder.find(n => n.role === 'coder');
  const reviewer = nodeOrder.find(n => n.role === 'reviewer');
  const tester = nodeOrder.find(n => n.role === 'tester');

  const errorRate = Math.max(0.05, (0.7 - hq) * 0.5);
  return rng.next() > errorRate;
}

// ==================== Check Cross-Cut Failures (internal) ====================

function checkCrossCutFailureInternal(
  harness: HarnessConfig,
  steps: TraceStep[],
  memoryUsed: number,
  coderEditCount: number,
  rng: SeededRng
): FailureReason {
  const stepCount = steps.length;
  const memoryCapacity = harness.memory_capacity;

  // MEMORY_STACK_OVERFLOW: stepCount >= 3 AND memoryCapacity <= 3 AND memory >= cap
  if (stepCount >= 3 && memoryCapacity <= 3 && memoryUsed >= memoryCapacity) {
    if (rng.chance(0.3)) return 'MEMORY_STACK_OVERFLOW';
  }

  // FILE_CORROSION: not has_state_persistence AND coderEdits >= 2
  if (!harness.has_state_persistence && coderEditCount >= 2) {
    if (rng.chance(0.4)) return 'FILE_CORROSION';
  }

  // HALLUCINATION: not has_tool_registry
  if (!harness.has_tool_registry) {
    if (rng.chance(0.3)) return 'HALLUCINATION';
  }

  return 'NONE';
}

// ==================== Default Graph ====================

function defaultGraph(): GraphSpec {
  return {
    state_schema: [],
    nodes: [{ id: 'node_1', role: 'coder', state_writes: [] }],
    edges: [],
    entry: 'node_1',
    checkpointing: false,
  };
}
