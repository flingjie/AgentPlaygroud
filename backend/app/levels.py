"""Predefined level definitions for the 4-level Agent Playground progression."""

from app.models import LevelInfo

# Six first-principles harness dimension keys (excludes memory_capacity / token_budget_cap)
HARNESS_SIX_KEYS = [
    "context_injection",
    "tool_surface",
    "persistence",
    "budget_guard",
    "sandbox_isolation",
    "tracing",
]

# ---------------------------------------------------------------------------
# Level 1 — Raw Model
# ---------------------------------------------------------------------------
LEVEL_1_RAW = LevelInfo(
    id="level_1_raw",
    name="The Raw Model",
    description=(
        "Agent = Model + Harness. With no harness, the runner cannot reliably "
        "terminate on real conditions — expect hallucinated tools, corrosion, "
        "and abandoned tasks."
    ),
    unlocked_harness=[],
    unlocked_loop=False,
    unlocked_graph=False,
    target_success_rate=0.08,
    token_budget=10_000,
)

# ---------------------------------------------------------------------------
# Level 2 — Harness
# ---------------------------------------------------------------------------
LEVEL_2_HARNESS = LevelInfo(
    id="level_2_harness",
    name="Harness Engineering",
    description=(
        "Same model, different harness — results diverge sharply. Unlock all "
        "six harness dimensions. Still no loop, so a single failed test abandons "
        "the task."
    ),
    unlocked_harness=list(HARNESS_SIX_KEYS),
    unlocked_loop=False,
    unlocked_graph=False,
    target_success_rate=0.40,
    token_budget=20_000,
)

# ---------------------------------------------------------------------------
# Level 3 — Loop
# ---------------------------------------------------------------------------
LEVEL_3_LOOP = LevelInfo(
    id="level_3_loop",
    name="Loop Engineering",
    description=(
        "Loop on evidence, not confidence. \"Agent says done\" is not a stop "
        "condition — configure trigger, goal, state/action policy, evidence, "
        "feedback, and stop rules. Loop engineering ≠ prompt engineering."
    ),
    unlocked_harness=list(HARNESS_SIX_KEYS),
    unlocked_loop=True,
    unlocked_graph=False,
    target_success_rate=0.70,
    token_budget=50_000,
)

# ---------------------------------------------------------------------------
# Level 4 — Graph
# ---------------------------------------------------------------------------
LEVEL_4_GRAPH = LevelInfo(
    id="level_4_graph",
    name="Graph Engineering",
    description=(
        "The graph decides who runs next — not what the agent does. Use "
        "conditional edges, state schema, and checkpointing for branch, "
        "parallel, review, and recovery. Simple single-agent tasks need no graph."
    ),
    unlocked_harness=list(HARNESS_SIX_KEYS),
    unlocked_loop=True,
    unlocked_graph=True,
    target_success_rate=0.90,
    token_budget=100_000,
)

# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------
ALL_LEVELS: list[LevelInfo] = [
    LEVEL_1_RAW,
    LEVEL_2_HARNESS,
    LEVEL_3_LOOP,
    LEVEL_4_GRAPH,
]

LEVELS_BY_ID: dict[str, LevelInfo] = {lvl.id: lvl for lvl in ALL_LEVELS}
