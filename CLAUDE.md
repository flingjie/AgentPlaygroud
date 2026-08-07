# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Vision

**Agent Engineering Simulator (表) + Agent Architect/OS (里)** — an interactive experiment platform, NOT a game. Players (engineers) compose an Agent Blueprint from three primitives — Harness, Loop, and Graph — and a deterministic simulation engine shows how each architecture choice moves a *target success rate* (an experiment metric, like a benchmark pass-rate) and a token *budget*. Failure is injected on purpose: every failed run lands on one of 13 reasons grouped by the **Agent Reliability Stack**, so the player learns *why* the architecture failed and what to change next. The final design of the Boss level (`level_6_agent_system`) is exportable as real LangGraph Python code and `arlo_config.yaml`.

**Learning loop**: configure → run → observe failure → upgrade architecture → compare results. All six levels are freely selectable; there is no 通关/升级/locking of levels. Success rate is measured, not scored.

**Positioning analogy**: Like Figma to Photoshop — the canvas is a fast, deterministic design/teaching environment; the output exports to real production tooling.

**MVP principle**: Pure simulation. No real LLM calls, no LangChain/LangGraph runtime dependency. 100% deterministic and reproducible.

## Architecture

```
                         Agent Blueprint
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
      Simulation Runtime                    Export Bridge
         (the engine)                  (LangGraph + arlo YAML)
              │
     Rule Engine + State Machine
        (failures, loops, budget)
```

**Agent Blueprint** is the canonical representation of the player's design. Simulation runs from it with near-zero cost. Export to LangGraph and arlo YAML has been removed in v2 and will be re-added in a future version.

### Why Pure Simulation

| Goal | Simulation | Real LLM Runtime |
|------|-----------|-----------------|
| Guaranteed failure at the right moment (pedagogical injection) | ✓ | ✗ |
| 100% reproducible experiment results | ✓ | ✗ |
| Near-zero cost per run | ✓ | ✗ |
| Measure how architecture moves success rate | ✓ | ✗ |
| MVP velocity | ✓ | ✗ |

Conclusion: LangGraph is the **export target**, not a runtime dependency. Do not introduce LangChain/LangGraph in the simulation path.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + TailwindCSS + Lucide Icons |
| Architect Canvas | React Flow (node-graph drag-and-drop) |
| Charts / Debugger | Recharts (Monte Carlo, Success Gauge) + custom panels (Timeline, Memory, Event Bus) |
| Static diagrams | Mermaid (per-level flow diagrams) |
| Simulation Engine | TypeScript, deterministic Monte Carlo runner with seedable RNG (mulberry32) |
| Real-time events | Client-side setTimeout streaming (step-by-step RunTrace replay in Debugger) |
| Export artifacts | LangGraph Python snippet, `arlo_config.yaml` (static text generation) |

## Architecture Layers

```
Frontend (React)
├── Factory View — Level Selector (free selection), Harness / Loop / Loop Stack config,
│                   Architecture Delta (0–100% bars + target), Success Gauge, Token Budget
├── Architect Canvas — drag-and-drop DAG nodes (planner/coder/reviewer/tester), edge
│                   conditions, state_schema, checkpointing, well-formedness validation
│                   (structural DEADLOCK detection is engine-side, in failureEngine.ts)
├── Debugger — Timeline, Memory Monitor, Event Bus, Monte Carlo Summary, Runtime Graph
│                   (active-node highlight), live step streaming, failure diagnosis hints
│
│ All simulation logic lives in the TypeScript simulator modules:
│   simulator/runtimeSimulator.ts — deterministic single-run engine
│   simulator/monteCarlo.ts — multi-run statistical runner
│   simulator/failureEngine.ts — 13 failure predicates, structural DEADLOCK detection
│   simulator/rng.ts — mulberry32 seedable RNG
│   types.ts — canonical data models (AgentBlueprint, RunTrace, etc.)
│   api.ts — thin wrapper: simulate() → simulateRun(), monteCarlo() → simulateMonteCarlo()
```

### Data Flow

```
LevelInfo (static level config, hard-coded in api.ts)
       +
AgentBlueprint (player's design, types.ts)
       │
       ▼
Simulation Engine ──→ RunTrace (steps + status + failure_reason + cost_tokens + topology)
```

## Core Data Models

All models live in `src/types.ts` (TypeScript interfaces).

### AgentBlueprint (canonical player design)

```json
{
  "level_id": "level_3_loop",
  "run_seed": 42,
  "harness": {
    "has_tool_registry": true,
    "has_retry_policy": true,
    "has_timeout_guard": true,
    "run_boundary_cap": 50000,
    "has_sandbox_isolation": true,
    "has_context_manager": true,
    "has_state_persistence": true,
    "has_permission_layer": true,
    "memory_capacity": 5
  },
  "loop": {
    "enabled": true,
    "trigger": "on_test_fail",
    "goal": "tests_green",
    "state_policy": "keep_last_error",
    "action_policy": "edit_then_retest",
    "evidence": "test_runner",
    "feedback": "reflexion",
    "stop_on": "evidence_pass",
    "max_iterations": 3
  },
  "loop_stack": { "enabled": false, "template": "none" },
  "graph": {
    "state_schema": ["files", "test_results"],
    "nodes": [{"id": "node_1", "role": "planner", "state_writes": []}],
    "edges": [{"source": "node_1", "target": "node_2", "condition": "always"}],
    "entry": "node_1",
    "checkpointing": false
  }
}
```

### Harness — seven first-principles dimensions

Observability (`has_tracing`) was removed — **tracing is always-on** in this simulator; every run produces a full `RunTrace`.

| Field | Label | Failure when absent |
|-------|-------|---------------------|
| `has_tool_registry` | Tool Registry | `HALLUCINATION` — the model invents APIs with no tool surface |
| `has_retry_policy` | Retry Policy | **Gate:** a loop enabled without it cannot actually retry → `INFINITE_LOOP_TRAP` (no retry mechanism). Not a quality booster. |
| `has_timeout_guard` | Timeout Guard | + `run_boundary_cap` (tokens) — unified run boundary → `BUDGET_EXHAUSTED` when exceeded |
| `has_sandbox_isolation` | Sandbox Isolation | `UNSAFE_EXECUTION` — destructive actions corrupt the environment (requires `has_tool_registry` present) |
| `has_context_manager` | Context Manager | `STALE_CONTEXT` — agent acts on an observation ≥2 changes stale |
| `has_state_persistence` | State Persistence | `FILE_CORROSION` — 2+ edits without versioning overwrite prior work |
| `has_permission_layer` | Permission Layer | `PERMISSION_ERROR` — capability ≠ permission; allowlist absent (requires `has_tool_registry` present) |

Sibling params: `memory_capacity` (int, 1–10, default 3) and `run_boundary_cap` (int, tokens).

### Loop — eight anatomy fields, ALL live in the engine

| Field | Options | Effect in `failureEngine.ts` |
|-------|---------|----------------------|
| `trigger` | `on_task_start` \| `on_test_fail` | `on_task_start` adds a CHECK_EVIDENCE overhead at loop start |
| `goal` | `tests_green` \| `schema_valid` | +0.05 success bonus when aligned with `evidence` (`tests_green`+`test_runner`, `schema_valid`+`schema_check`) |
| `state_policy` | `stateless` \| `keep_last_error` \| `keep_run_summary` | context-full risk at full memory: 0.2 / 0.55 / 0.75 → `CONTEXT_OVERFLOW` |
| `action_policy` | `retry_same` \| `edit_then_retest` \| `escalate_review` | what a retry *does*: +0.0 / +0.10 (each retry includes an EDIT_FILE) / +0.05 (needs a reviewer, else `INFINITE_LOOP_TRAP`) |
| `evidence` | `none` \| `test_runner` \| `schema_check` \| `reviewer_signoff` | enables grounded stop + goal alignment; `none` loops blindly |
| `feedback` | `none` \| `compact_error` \| `reflexion` | per-attempt error decay: 0.05 / 0.12 / 0.25 |
| `stop_on` | `agent_says_done` \| `evidence_pass` \| `budget_or_max` | `agent_says_done` → `FALSE_COMPLETION` (ungrounded "done"); `budget_or_max` honours the run boundary |
| `max_iterations` | int, 1–10 | retry cap; exhaustion without evidence → `INFINITE_LOOP_TRAP` |

`enabled: bool` gates whether the loop path runs at all.

### Loop Stack — preset multi-loop templates (read-only internals)

`loop_stack.template`: `none` \| `single` \| `dual` \| `factory`. Templates are preset and read-only, presented with a "why" explanation layer (`LoopStackConfig.tsx`).

- **single** — one verification loop (verify on evidence). L4/L5.
- **dual** — inner **verify** loop (max 3, `edit_then_retest`, `test_runner` evidence) nested inside an outer **improve** loop (max 5, `escalate_review`, `reviewer_signoff`). L4/L5.
- **factory** — Plan → Build → Test → Review → Release pipeline; each stage runs a test, failure at a stage returns `FALSE_COMPLETION` (test) or `TASK_ABANDONED`. L6 (Boss) only.

Unlocks per level: L4/L5 → `["single", "dual"]`; L6 → `["factory"]`.

### Graph — control flow, not agent behaviour

- **Nodes** (`role`): `planner` \| `coder` \| `reviewer` \| `tester`, each with `state_writes`.
- **Edges** (`condition`): `always` \| `on_pass` \| `on_fail` \| `on_review_reject` \| `on_human_approve`.
- **`entry`** — start node; **`checkpointing`** — recovery probability `min(0.9, 0.45 + 0.05·len(state_schema))` after an abandoned test.
- **`state_schema`** — adds a memory surcharge per node action (`len(state_schema)` extra memory units) and scales the checkpointing recovery chance.
- **Topology** is classified per run: `single` / `chain` / `parallel` / `feedback`; parallel coders can rescue each other; feedback edges trigger a rework cycle with halved error rate.
- **Structural `DEADLOCK`** (never probabilistic) short-circuits the run before any node simulates: an unreachable node, or a failure-condition edge (`on_fail`/`on_review_reject`) that dead-ends with no recovery path.

### RunTrace (simulation output)

```json
{
  "run_id": "sim_88392",
  "status": "FAILED",
  "failure_reason": "INFINITE_LOOP_TRAP",
  "cost_tokens": 14200,
  "topology": {"kind": "chain", "has_feedback": false, "parallel_coders": 0, "isolated_nodes": []},
  "steps": [
    {"step": 1, "node": "coder", "action": "EDIT_FILE", "status": "SUCCESS", "memory_used": 2},
    {"step": 2, "node": "coder", "action": "RUN_TEST", "status": "FAIL", "memory_used": 3},
    {"step": 3, "node": "coder", "action": "RETRY", "status": "FAIL", "memory_used": 5, "warning": "Context window full — memory capacity exhausted during retry loop. Enable context_manager, use a leaner state_policy, or isolate via graph."}
  ]
}
```

Per-action token cost: THINK 1000, EDIT_FILE 2500, RUN_TEST 1500, RETRY 800, CHECK_EVIDENCE 500, STOP 100.

## Failure Modes — the 13-reason Agent Reliability Stack

The engine deterministically injects failures based on configuration, grouped by reliability layer:

| Layer | Failure | Trigger Condition |
|-------|---------|-------------------|
| Model | `HALLUCINATION` | No `has_tool_registry` — the model invents tool APIs |
| Tool | `TOOL_FAILURE` | A real tool returns garbage (unreliable tool output; only a verification loop catches it) |
| Workspace | `FILE_CORROSION` | No `has_state_persistence`, 2+ coder edits overwrite prior work |
| Memory | `MEMORY_STACK_OVERFLOW` | ≥3 steps with small buffer, at/over `memory_capacity` |
| Memory | `CONTEXT_OVERFLOW` | Context window full during retries; risk driven by `state_policy` (0.2/0.55/0.75) |
| Observation | `STALE_CONTEXT` | No `has_context_manager`; observed state lags real state by ≥2 changes |
| Evidence | `FALSE_COMPLETION` | `stop_on=agent_says_done` — "done" claimed without grounded evidence |
| Permission | `PERMISSION_ERROR` | Capability ≠ permission; no `has_permission_layer` allowlist |
| Control | `DEADLOCK` | **Structural, never probabilistic** — unreachable node or dead-ending failure edge |
| Control | `INFINITE_LOOP_TRAP` | Loop with no retry mechanism (`has_retry_policy`) or `max_iterations` exhausted without evidence |
| Execution | `BUDGET_EXHAUSTED` | `has_timeout_guard` + `run_boundary_cap` exceeded (tokens) |
| Loop discipline | `TASK_ABANDONED` | No loop enabled — single test failure ends the run |
| Boss | `UNSAFE_EXECUTION` | Destructive action with no `has_sandbox_isolation` |

### Core Simulation Formula

```python
# Loop success per attempt (evidence_pass path, reflexion feedback)
error_rate = max(0.1, 0.8 - attempt * 0.25 - harness_quality - goal_bonus - action_bonus)

# Harness quality — six effect dims; retry_policy is a GATE, not a booster
harness_quality = 0.1 * (tool_registry + timeout_guard + sandbox_isolation
                         + context_manager + state_persistence + permission_layer) \
                  + 0.05 * min(memory_capacity, 10)
```

Deterministic seeding: `random.Random(seed=blueprint.run_seed or base_seed)`; `run_id` is derived from that RNG's bits. Monte Carlo runs `seed = base_seed + i` per run — same blueprint + seed always produces identical output.

## Six-Level Progression (all freely selectable)

Target success rate is an **experiment benchmark**, not a pass/fail game score. Levels gate *capabilities* (which config panels unlock), never *access* to other levels.

| id | Formal name | Teaching label | Target | Budget | Unlocks |
|----|-------------|----------------|--------|--------|---------|
| `level_1_raw` | Agent | Raw LLM | 8% | 10k | nothing — a model alone is not an agent |
| `level_2_harness` | Agent + Harness | Tool Agent | 40% | 20k | all seven harness dims; no loop → first test failure abandons |
| `level_3_loop` | Agent + Loop | Single Loop | 70% | 50k | loop anatomy (trigger/goal/state/action/evidence/feedback/stop/max) |
| `level_4_loop_stack` | Agent + Loop Stack | Loop Stack | 80% | 80k | loop-stack templates `single` / `dual` |
| `level_5_graph` | Agent + Graph | Agent Graph | 90% | 120k | graph editor (planner/coder/reviewer/tester, conditional edges) |
| `level_6_agent_system` | Agent System | Agent Factory | 95% | 200k | factory loop template + **Export** tab |

## Educational UI (src/components)

- **LevelSelector** — free selection dropdown; shows formal name + teaching label, target rate, token budget, current measured success rate; renders the level's static flow diagram.
- **ArchitectureDelta** — fixed 0–100% reliability bars for all six levels with a target marker (each architecture stage's theoretical reliability on a fixed 0–100% scale; nothing is locked).
- **StaticFlowDiagram** — per-level Mermaid diagram. **Static allowlist keyed by level_id** — NEVER derive diagram source from user input, API responses, or blueprint fields (mermaid output is injected via `innerHTML`; a dynamic source would be an XSS path). `mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })`.
- **ArchitectCanvas** (React Flow) — drag-and-drop nodes, edge conditions, `state_schema`/`checkpointing`; available only when `level.unlocked_graph`.
- **Debugger** — Timeline, Memory Monitor, Event Bus, Monte Carlo Summary (failure distribution + sample traces), **RuntimeGraph** (active-node highlight from the latest trace), live step streaming, and failure-diagnosis hints (why it failed + how to fix).
- i18n: `en` / `zh` (`src/i18n/en.json`, `zh.json`), including per-failure hints.

## API Surface (src/api.ts)

All simulation runs client-side through the TypeScript simulator modules. `api.ts` is a thin wrapper:

| Function | Purpose |
|----------|---------|
| `getLevels()` | returns static `LevelInfo[]` array |
| `simulate(blueprint)` | → `RunTrace` via `simulateRun()` from `simulator/runtimeSimulator.ts` |
| `monteCarlo(blueprint, numRuns)` | → `MonteCarloResult` via `simulateMonteCarlo()` from `simulator/monteCarlo.ts` |
| `connectSimulationWebSocket(runId, trace, onStep, onComplete)` | mock-only: replays trace steps via setTimeout for Debugger live view |

## Development Status / Roadmap

### Built now (MVP complete)

- Deterministic Simulation Engine (seeded Monte Carlo), all 13 failure injections live — including `TOOL_FAILURE` (a real tool returns garbage; only a grounded verification loop catches it), the 8-field loop, loop-stack templates, graph topology + structural DEADLOCK, and budget enforcement.
- Six-level progression, 7-dim harness config, Architecture Delta, static flow diagrams, runtime graph, export bridge, en/zh i18n.

### Deferred (Phase 2 / intentionally out of scope)

- **Experiment Compare** view (side-by-side A/B of two blueprints).
- RuntimeGraph edge rendering (node-highlight first per "简单实用").
- Live IDE inside ExportView (currently static preview only).
- Editable loop-stack internals (templates are preset + read-only by design).
- Real LLM/LangGraph runtime — never in the simulation path; LangGraph remains an export artifact only.

## Key Design Decisions

1. **AgentBlueprint is the single source of truth** — one schema drives simulation and UI (`types.ts`).
2. **Deterministic seeds for reproducibility** — every run is replayable from `blueprint.run_seed`; Monte Carlo uses `base_seed + i`.
3. **Pure simulation, zero LLM cost** — 100% of experiment runs use the simulation engine.
4. **LangGraph is an export artifact, not a runtime dependency** — do not introduce LangChain/LangGraph in the simulation code path.
5. **Client-side simulation** — all runs execute in the browser via the TypeScript simulator; no server dependency.
6. **Export as first-class feature** — the player's final Blueprint IS the product, bridging experiment → production tooling.
7. **Failure injection is pedagogical, not random** — each level guarantees specific failure modes so the player always learns the intended lesson.
8. **No game-ification** — no 通关/推荐/升级/locking; all six levels are freely selectable and success rate is measured, not scored.
9. **Observability is always-on** — `has_tracing` was removed; every run produces a full `RunTrace` with topology.
10. **Retry Policy is a gate, not a booster** — a loop without `has_retry_policy` physically cannot retry and traps.
11. **Structural DEADLOCK is detected, not simulated** — unreachable nodes / dead-ending failure edges short-circuit before any step runs.
12. **Static allowlist for diagrams** — Mermaid sources are keyed by level_id and never derived from dynamic input (XSS constraint on `innerHTML`).
