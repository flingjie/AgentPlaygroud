"""Predefined level definitions for the 4-level Agent Playground progression."""

from app.models import LevelInfo

# ---------------------------------------------------------------------------
# Level 1 — Raw Agent
# ---------------------------------------------------------------------------
LEVEL_1_RAW = LevelInfo(
    id="level_1_raw",
    name="The Raw Agent",
    description=(
        "No harness, no loop, no graph. A single coder node operating "
        "without any safety nets. Expect lots of failures — learn what "
        "breaks when an agent has zero infrastructure."
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
    name="Safety Harness",
    description=(
        "Unlock workspace, sandbox, Git, and memory buffer. Still no loop "
        "strategy, so a single test failure means the task is abandoned. "
        "Learn how infrastructure reduces common failure modes."
    ),
    unlocked_harness=["workspace", "sandbox", "git", "memory"],
    unlocked_loop=False,
    unlocked_graph=False,
    target_success_rate=0.40,
    token_budget=20_000,
)

# ---------------------------------------------------------------------------
# Level 3 — Loop Strategy
# ---------------------------------------------------------------------------
LEVEL_3_LOOP = LevelInfo(
    id="level_3_loop",
    name="The Loop",
    description=(
        "Unlock the react_reflexion loop strategy with up to 5 retries "
        "and a test_pass stop condition. The agent can now recover from "
        "failures automatically. Master the feedback loop."
    ),
    unlocked_harness=["workspace", "sandbox", "git", "memory"],
    unlocked_loop=True,
    unlocked_graph=False,
    target_success_rate=0.70,
    token_budget=50_000,
)

# ---------------------------------------------------------------------------
# Level 4 — Multi-Agent Graph
# ---------------------------------------------------------------------------
LEVEL_4_GRAPH = LevelInfo(
    id="level_4_graph",
    name="The Graph",
    description=(
        "Unlock the multi-agent graph: planner → coder → reviewer. "
        "Each agent has isolated memory, and the chain provides built-in "
        "review. Full harness + loop enabled. Reach near-perfect reliability."
    ),
    unlocked_harness=["workspace", "sandbox", "git", "memory"],
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
