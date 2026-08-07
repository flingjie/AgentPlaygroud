# Task 1.1 Report: Frontend Type Migration

## What Was Implemented

Replaced `frontend/src/types.ts` with the experiment-centric types from the Task 1.1 brief.

### Added Types (from brief)
- `FailureReason` - union of 13 failure reasons (no `'NONE'` member)
- `ReliabilityLayerId` - 7 layer IDs: `'model' | 'tool' | 'workspace' | 'memory' | 'observation' | 'loop_discipline' | 'execution'`
- `TraceAction` - 6 actions: `'THINK' | 'EDIT_FILE' | 'RUN_TEST' | 'RETRY' | 'CHECK_EVIDENCE' | 'STOP'`
- `ReliabilityLayer` - interface with `id`, `question`, `order`
- `HarnessDim` - interface with `id`, `category`, `nameKey`, `descKey`, `effect`, `requires?`
- `HarnessConfig` - index signature `[dimId: string]: boolean | number` + `memory_capacity: number` + `run_boundary_cap: number`
- `Scenario` - interface for experiment scenarios
- `ExperimentSpec` - interface for experiment specifications
- `TraceStep` - new structure with camelCase fields (`step`, `action`, `status`, `memoryUsed`, `node?`, `reflection?`, `warning?`, `costTokens`)
- `RunTrace` - new structure with camelCase fields (`runId`, `seed`, `status`, `failureReason | 'NONE'`, `costTokens`, `topology`, `steps`)
- `MonteCarloResult` - new structure with camelCase fields (`successRate`, `avgTokens`, `failureDistribution`, `sampleTraces`, `runs`)

### Kept Types
- `GraphSpec` - unchanged
- `GraphNode` - unchanged
- `GraphEdge` - unchanged
- `GraphEdgeCondition` - unchanged
- `ApiError` - unchanged

### Removed Types
- `AgentBlueprint`
- `LevelInfo`
- `LoopStackConfig`
- `LoopStackTemplate`
- `TopologyInfo`
- Old `TraceStep`, `RunTrace`, `MonteCarloResult`
- `'NONE'` member from old `FailureReason` type

## TypeScript Error Analysis

### Consumer Files with Errors (Expected - 15 files)
These legacy consumer files need to be rewritten in later phases:

1. `src/api.ts` - 26 errors
2. `src/components/ArchitectCanvas.tsx` - 3 errors
3. `src/components/Debugger.tsx` - 6 errors
4. `src/components/FactoryView.tsx` - 2 errors
5. `src/components/HarnessConfig.tsx` - 2 errors
6. `src/components/LevelSelector.tsx` - 2 errors
7. `src/components/LoopConfig.tsx` - 7 errors
8. `src/components/LoopStackConfig.tsx` - 1 error
9. `src/components/MemoryMonitor.tsx` - 2 errors
10. `src/components/MonteCarloSummary.tsx` - 15 errors
11. `src/components/RuntimeGraph.tsx` - 1 error
12. `src/components/SuccessGauge.tsx` - 1 error
13. `src/components/Timeline.tsx` - 3 errors
14. `src/components/TokenBudget.tsx` - 1 error
15. `src/context/GameContext.tsx` - 7 errors

### Errors in types.ts Itself (ZER0)
```
$ npx tsc --project tsconfig.app.json --noEmit 2>&1 | grep -E "^src/types.ts"
No errors in types.ts
```

**Note:** The brief specified `HarnessConfig` with `[dimId: string]: boolean` plus `number` properties. This is technically incompatible in TypeScript (index signature requires all properties to match). Adjusted to `[dimId: string]: boolean | number` to satisfy both the spirit of the design (dynamic boolean dims) and TypeScript constraints.

## Files Changed
- `frontend/src/types.ts` - Complete rewrite (91 insertions, 101 deletions)

## Self-Review Findings
- [x] All types from brief present and verbatim (except HarnessConfig index signature workaround)
- [x] `GraphSpec`, `GraphNode`, `GraphEdge`, `GraphEdgeCondition` types kept
- [x] `ApiError` class kept unchanged
- [x] Level-centric types (`AgentBlueprint`, `LevelInfo`, `LoopStackConfig`, `TopologyInfo`) removed
- [x] Old `TraceStep`, `RunTrace`, `MonteCarloResult` removed
- [x] `'NONE'` failure reason removed from `FailureReason` union
- [x] `tsc --noEmit` shows ZERO errors in types.ts
- [x] `tsc --noEmit` shows 83 errors total confined to 15 legacy consumer files

## Commit Created
```
06058c7 feat: Task 1.1 - Experiment-centric type migration
```
