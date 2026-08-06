from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# AgentBlueprint and its sub-models
# ---------------------------------------------------------------------------


class HarnessConfig(BaseModel):
    has_context_injection: bool = False
    has_tool_surface: bool = False
    has_persistence: bool = False
    has_budget_guard: bool = False
    token_budget_cap: int | None = Field(default=None, gt=0)
    has_sandbox_isolation: bool = False
    has_tracing: bool = False
    memory_capacity: int = Field(default=3, ge=1, le=10)


class LoopConfig(BaseModel):
    enabled: bool = False
    trigger: Literal["on_task_start", "on_test_fail"] = "on_task_start"
    goal: Literal["tests_green", "schema_valid"] = "tests_green"
    state_policy: Literal["stateless", "keep_last_error", "keep_run_summary"] = "stateless"
    action_policy: Literal["retry_same", "edit_then_retest", "escalate_review"] = "retry_same"
    evidence: Literal["none", "test_runner", "schema_check", "reviewer_signoff"] = "none"
    feedback: Literal["none", "compact_error", "reflexion"] = "none"
    stop_on: Literal["agent_says_done", "evidence_pass", "budget_or_max"] = "agent_says_done"
    max_iterations: int = Field(default=1, ge=1, le=10)


class GraphEdge(BaseModel):
    source: str
    target: str
    condition: Literal[
        "always", "on_pass", "on_fail", "on_review_reject", "on_human_approve"
    ] = "always"


class GraphNode(BaseModel):
    id: str = Field(min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    role: Literal["planner", "coder", "reviewer", "tester"]
    state_writes: list[str] = []


class GraphSpec(BaseModel):
    state_schema: list[str] = []
    nodes: list[GraphNode] = Field(default_factory=list)
    edges: list[GraphEdge] = Field(default_factory=list)
    entry: str | None = None
    checkpointing: bool = False


class AgentBlueprint(BaseModel):
    level_id: str
    run_seed: int | None = None  # None → random; int → deterministic replay
    harness: HarnessConfig = Field(default_factory=HarnessConfig)
    loop: LoopConfig = Field(default_factory=LoopConfig)
    graph: GraphSpec = Field(default_factory=GraphSpec)


# ---------------------------------------------------------------------------
# RunTrace and its sub-models
# ---------------------------------------------------------------------------


class StepStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAIL = "FAIL"


class FailureReason(str, Enum):
    NONE = "NONE"
    HALLUCINATED_TOOL = "HALLUCINATED_TOOL"
    FILE_CORROSION = "FILE_CORROSION"
    MEMORY_STACK_OVERFLOW = "MEMORY_STACK_OVERFLOW"
    CONTEXT_FULL = "CONTEXT_FULL"
    INFINITE_LOOP_TRAP = "INFINITE_LOOP_TRAP"
    TASK_ABANDONED = "TASK_ABANDONED"
    BUDGET_EXHAUSTED = "BUDGET_EXHAUSTED"
    UNGROUNDED_STOP = "UNGROUNDED_STOP"


class TraceStep(BaseModel):
    step: int
    node: str
    action: Literal["THINK", "EDIT_FILE", "RUN_TEST", "RETRY", "CHECK_EVIDENCE", "STOP"]
    status: StepStatus
    memory_used: int
    warning: str | None = None
    reflection: str | None = None  # i18n key, e.g. "reflect_test_fail"


class TopologyInfo(BaseModel):
    kind: Literal["single", "chain", "parallel", "feedback"]
    has_feedback: bool = False
    parallel_coders: int = 0
    isolated_nodes: list[str] = []


class RunTrace(BaseModel):
    run_id: str
    status: Literal["SUCCESS", "FAILED"]
    failure_reason: FailureReason = FailureReason.NONE
    cost_tokens: int = 0
    steps: list[TraceStep] = []
    topology: TopologyInfo | None = None


# ---------------------------------------------------------------------------
# Level configuration
# ---------------------------------------------------------------------------


class LevelInfo(BaseModel):
    id: str
    name: str
    description: str
    unlocked_harness: list[str]  # six dim keys, e.g. context_injection, tool_surface, …
    unlocked_loop: bool
    unlocked_graph: bool
    target_success_rate: float
    token_budget: int


# ---------------------------------------------------------------------------
# Monte Carlo request / response
# ---------------------------------------------------------------------------


class MonteCarloRequest(BaseModel):
    blueprint: AgentBlueprint
    num_runs: int = Field(default=100, ge=1, le=10_000)


class MonteCarloResponse(BaseModel):
    success_rate: float
    avg_tokens: float
    failure_distribution: dict[str, int]
    sample_traces: list[RunTrace]
