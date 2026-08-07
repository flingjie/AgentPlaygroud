# Engine Port Reference Notes

Source of truth for porting `backend/app/engine.py` → TypeScript. Every formula and
predicate below is quoted from the Python implementation (verified against the code,
not from memory). All values are exact.

## Determinism contract

- `random.Random(seed=blueprint.run_seed or base_seed)` drives the whole simulation.
- `run_id` is derived from that RNG's bits.
- Monte Carlo: run `i` uses `seed = base_seed + i`. Same blueprint + seed ⇒ identical output.
- The TS port must reproduce *internal* determinism (same seed ⇒ same trace & distribution).
  It does NOT need byte-identical output to the Python engine (which is deleted).

## Per-action token cost

```python
ACTION_TOKEN_COST = {
    "THINK": 1000,
    "EDIT_FILE": 2500,
    "RUN_TEST": 1500,
    "RETRY": 800,
    "CHECK_EVIDENCE": 500,
    "STOP": 100,
}
```

## Per-action memory cost

```python
base = {"THINK": 1, "EDIT_FILE": 2, "RUN_TEST": 1, "RETRY": 1, "CHECK_EVIDENCE": 1, "STOP": 0}
cost = base.get(action, 1)
if current < capacity:
    return min(cost, capacity - current)   # clamp to remaining capacity
return cost                                 # at/over capacity: return base (allows overflow tracking)
```

## Harness quality

`retry_policy` is a GATE, not a booster. Six effect dims + memory.

```python
def _harness_quality(harness):
    dims = (has_tool_registry + has_timeout_guard + has_sandbox_isolation
            + has_context_manager + has_state_persistence + has_permission_layer)
    return 0.1 * dims + 0.05 * min(harness.memory_capacity, 10)
```

## Loop error_rate per attempt

From `_simulate_loop` (engine.py:1320–1360). `max_retries = loop.max_iterations`.

```python
goal_bonus = 0.05 if (goal=="tests_green" and evidence=="test_runner")
                     or (goal=="schema_valid" and evidence=="schema_check") else 0.0

action_bonus: "edit_then_retest" → 0.10
              "escalate_review"  → 0.05 if graph has reviewer, else immediate INFINITE_LOOP_TRAP
              "retry_same"       → 0.0

for attempt in range(max_retries):
    if not has_evidence:                          # evidence == "none"
        error_rate = max(0.1, 0.8 - harness_quality)
    elif feedback == "reflexion":
        error_rate = max(0.1, 0.8 - attempt*0.25 - hq - goal_bonus - action_bonus)
    elif feedback == "compact_error":
        error_rate = max(0.1, 0.8 - attempt*0.12 - hq - goal_bonus - action_bonus)
    else:                                          # feedback == "none"
        error_rate = max(0.1, 0.8 - attempt*0.05 - hq - goal_bonus - action_bonus)
    if rng.random() > error_rate:
        return (SUCCESS, attempt + 1)
return (FAIL, max_retries)
```

Note the feedback decay is **per-attempt slope** (0.25 / 0.12 / 0.05), not a flat bonus.

## 13 failure predicates (single-cause, keyed to config flags)

Order matters — first matching predicate wins per step (engine.py `_check_step_failure`).

| # | Failure | Step-gate predicate | Step rate | Cross-cut rate |
|---|---------|--------------------|-----------|----------------|
| 1 | `HALLUCINATION` | `not has_tool_registry` AND node.role=="coder" | 0.65 (0.5 if sandbox enabled) | 0.3 |
| 2 | `TOOL_FAILURE` | `has_tool_registry` AND coder AND NOT (loop.enabled and evidence != "none") | 0.15 | — |
| 3 | `FILE_CORROSION` | `not has_state_persistence` AND coder AND edit_count ≥ 2 | 0.6 | 0.4 |
| 4 | `MEMORY_STACK_OVERFLOW` | step_count ≥ 3 AND memory_capacity ≤ 3 AND memory ≥ cap | 0.5 | 0.3 |
| 5 | `CONTEXT_OVERFLOW` | loop.enabled AND memory ≥ cap AND `_context_full_risk`>0 | risk (below) | — |
| 6 | `STALE_CONTEXT` | `not has_context_manager` AND coder AND `_stale_risk`(in_flight_edits=1) | 0.20 | — |
| 7 | `PERMISSION_ERROR` | `has_tool_registry` AND coder AND `not has_permission_layer` (gated on a 0.20 roll) | 0.20 | — |
| 8 | `UNSAFE_EXECUTION` | `has_tool_registry` AND `not has_sandbox_isolation` | 0.15 | — |
| 9 | `TASK_ABANDONED` | no loop, single test attempt fails; factory non-tester stage fails | structural | — |
| 10 | `INFINITE_LOOP_TRAP` | loop on but `not has_retry_policy` (short-circuit, 0 steps); loop exhaustion no evidence; dual-stack inner/outer fail | structural | — |
| 11 | `FALSE_COMPLETION` | `stop_on=="agent_says_done"` ungrounded stop, keep-rate 0.7; factory tester-stage | 0.7 keep | — |
| 12 | `BUDGET_EXHAUSTED` | `has_timeout_guard` AND run_boundary_cap set AND cost > cap | check after run | — |
| 13 | `DEADLOCK` | structural: unreachable node, or failure-condition edge dead-ends with no recovery | short-circuits pre-step | — |

### Context-overflow risk (`_context_full_risk`)

```python
if state_policy == "stateless":          return 0.2
if state_policy == "keep_last_error":    return 0.55
if state_policy == "keep_run_summary":   return 0.75
```

### Stale-risk (`_stale_risk`)

state_version increments on every EDIT_FILE; observed_version is captured at the last
THINK or CHECK_EVIDENCE. Lag = (state_version + in_flight_edits) − observed_version.
Stale iff lag ≥ 2. A THINK→EDIT#1→EDIT#2 coder acts on a snapshot 2 edits old.

### Budget check (`_check_budget`)

```python
if has_timeout_guard and run_boundary_cap is not None and cost_tokens > run_boundary_cap:
    return BUDGET_EXHAUSTED
```

## Structural DEADLOCK (`_detect_deadlock`, pre-simulation)

Never probabilistic. Short-circuits before any node simulates (engine.py:274–296).
Two structural conditions:
1. A node that is **unreachable** from the effective entry point.
2. A **failure-condition edge** (`on_fail` / `on_review_reject`) whose target has **no
   outgoing edge** — a failure state with no recovery path.

## Non-loop success-rate paths (for reference)

- Single test pass without loop: `test_pass = rng.random() > max(0.1, 0.7 - hq)`.
- Ungrounded `agent_says_done` stop: `evidence_ok = rng.random() > max(0.1, 0.55 - hq)`;
  on evidence fail, `FALSE_COMPLETION` with keep-rate `rng.random() < 0.7`.
- Parallel-coder rescue: `fix_chance = 0.7 if graph_bonus else 0.3` (parallel coders can
  fix each other).
- Feedback-rework error rate: `error_rate = max(0.05, (0.7 - hq) * 0.5)`.

## Checkpointing recovery

After an abandoned test, if `graph.checkpointing`:
`recover if rng.random() < min(0.9, 0.45 + 0.05 * len(graph.state_schema))`.

## State-schema memory surcharge

`len(state_schema)` extra memory units per node action.

## Graph topology classification

Derived per run: `single` / `chain` / `parallel` / `feedback`.
- parallel: ≥2 coder nodes → mutual rescue (fix_chance above).
- feedback: rework cycle with halved error rate; on success appends rework steps and
  resets the failure.
- `isolated_nodes` computed; if all nodes isolated, set to `[]`.

## Loop-stack templates (engine internals — NOT a UI concept in the new design)

- **single** — falls through to the single-loop path.
- **dual** — inner **verify** loop (max 3, `edit_then_retest`, `test_runner` evidence)
  nested in outer **improve** loop (max 5, `escalate_review`, `reviewer_signoff`).
  Inner/outer exhaustion or missing reviewer → `INFINITE_LOOP_TRAP`.
- **factory** — Plan → Build → Test → Review → Release. Each stage runs a test; a
  non-tester stage failure → `TASK_ABANDONED`, tester-stage failure → `FALSE_COMPLETION`;
  missing retry mechanism → `INFINITE_LOOP_TRAP`. Retry roll `failed = rng.random() <= max(0.05, 0.25 - hq*0.2)`.

## Level reachable-failure families

The engine **never reads `level_id`** — simulation is driven entirely by blueprint flags.
Per-level *reachable* families (which flags that level allows):

| Level | Reachable failures |
|-------|--------------------|
| L1 Raw LLM | HALLUCINATION, STALE_CONTEXT, FILE_CORROSION, MEMORY_STACK_OVERFLOW, TASK_ABANDONED |
| L2 Tool Agent | + TOOL_FAILURE, BUDGET_EXHAUSTED |
| L3 Single Loop | FALSE_COMPLETION, INFINITE_LOOP_TRAP, CONTEXT_OVERFLOW, BUDGET_EXHAUSTED |
| L4 Loop Stack | INFINITE_LOOP_TRAP, CONTEXT_OVERFLOW, BUDGET_EXHAUSTED |
| L5 Graph | + DEADLOCK (structural), feedback rework rescue, checkpointing |
| L6 Factory | TASK_ABANDONED, FALSE_COMPLETION, INFINITE_LOOP_TRAP |

## Warning → failure mapping (`_WARNING_TO_FAILURE`)

Every warning constant maps 1:1 to a failure reason (all 13 present). The TS port can
use the same trick: the failure reason IS the actionable warning.
