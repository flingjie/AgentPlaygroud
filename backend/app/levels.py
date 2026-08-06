"""Six-level progression for the Agent Engineering Simulator."""

from app.models import LevelInfo

# Seven first-principles harness dimension keys (excludes memory_capacity / run_boundary_cap)
HARNESS_SEVEN_KEYS = [
    "tool_registry",
    "retry_policy",
    "timeout_guard",
    "sandbox_isolation",
    "context_manager",
    "state_persistence",
    "permission_layer",
]

LEVEL_1_RAW = LevelInfo(
    id="level_1_raw",
    name="Agent",
    description=(
        "A model alone is not an agent. With no harness, the runner cannot "
        "ground tools, persist work, or stop on real evidence."
    ),
    learning_label="Raw LLM",
    unlocked_harness=[],
    unlocked_loop=False,
    unlocked_loop_stack=False,
    unlocked_loop_templates=[],
    unlocked_graph=False,
    target_success_rate=0.08,
    token_budget=10_000,
)

LEVEL_2_HARNESS = LevelInfo(
    id="level_2_harness",
    name="Agent + Harness",
    description=(
        "Same model, different harness — results diverge sharply. Unlock all "
        "seven dimensions. Still no loop, so a single failed test abandons the task."
    ),
    learning_label="Tool Agent",
    unlocked_harness=list(HARNESS_SEVEN_KEYS),
    unlocked_loop=False,
    unlocked_loop_stack=False,
    unlocked_loop_templates=[],
    unlocked_graph=False,
    target_success_rate=0.40,
    token_budget=20_000,
)

LEVEL_3_LOOP = LevelInfo(
    id="level_3_loop",
    name="Agent + Loop",
    description=(
        "Loop on evidence, not confidence. Configure trigger, goal, state/action "
        "policy, evidence, feedback, and stop rules. Loop engineering != prompt engineering."
    ),
    learning_label="Single Loop",
    unlocked_harness=list(HARNESS_SEVEN_KEYS),
    unlocked_loop=True,
    unlocked_loop_stack=False,
    unlocked_loop_templates=[],
    unlocked_graph=False,
    target_success_rate=0.70,
    token_budget=50_000,
)

LEVEL_4_LOOP_STACK = LevelInfo(
    id="level_4_loop_stack",
    name="Agent + Loop Stack",
    description=(
        "Two loops can cooperate or fight. Pick a template: a single verification "
        "loop, or a verification loop nested inside an improvement loop."
    ),
    learning_label="Loop Stack",
    unlocked_harness=list(HARNESS_SEVEN_KEYS),
    unlocked_loop=True,
    unlocked_loop_stack=True,
    unlocked_loop_templates=["single", "dual"],
    unlocked_graph=False,
    target_success_rate=0.80,
    token_budget=80_000,
)

LEVEL_5_GRAPH = LevelInfo(
    id="level_5_graph",
    name="Agent + Graph",
    description=(
        "The graph decides who runs next — not what the agent does. Conditional "
        "edges route control flow; failure states must always have a recovery path."
    ),
    learning_label="Agent Graph",
    unlocked_harness=list(HARNESS_SEVEN_KEYS),
    unlocked_loop=True,
    unlocked_loop_stack=True,
    unlocked_loop_templates=["single", "dual"],
    unlocked_graph=True,
    target_success_rate=0.90,
    token_budget=120_000,
)

LEVEL_6_AGENT_SYSTEM = LevelInfo(
    id="level_6_agent_system",
    name="Agent System",
    description=(
        "Plan → Build → Test → Review → Release. Combine the full harness, a "
        "factory loop template, and export the blueprint as real code."
    ),
    learning_label="Agent Factory",
    unlocked_harness=list(HARNESS_SEVEN_KEYS),
    unlocked_loop=True,
    unlocked_loop_stack=True,
    unlocked_loop_templates=["factory"],
    unlocked_graph=True,
    target_success_rate=0.95,
    token_budget=200_000,
)

ALL_LEVELS: list[LevelInfo] = [
    LEVEL_1_RAW,
    LEVEL_2_HARNESS,
    LEVEL_3_LOOP,
    LEVEL_4_LOOP_STACK,
    LEVEL_5_GRAPH,
    LEVEL_6_AGENT_SYSTEM,
]

LEVELS_BY_ID: dict[str, LevelInfo] = {lvl.id: lvl for lvl in ALL_LEVELS}
