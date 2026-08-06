from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# AgentBlueprint and its sub-models
# ---------------------------------------------------------------------------


class HarnessConfig(BaseModel):
    has_workspace: bool = False
    has_sandbox: bool = False
    has_git: bool = False
    memory_capacity: int = Field(default=3, ge=1, le=10)


class LoopStrategy(BaseModel):
    type: Literal["none", "retry_blind", "react_reflexion"] = "none"
    max_retries: int = Field(default=1, ge=1)
    stop_condition: Literal["none", "test_pass"] = "none"


class GraphNode(BaseModel):
    id: str
    role: Literal["planner", "coder", "reviewer", "tester"]
    next: list[str] = []


class AgentBlueprint(BaseModel):
    level_id: str
    run_seed: int | None = None  # None → random; int → deterministic replay
    harness: HarnessConfig = Field(default_factory=HarnessConfig)
    loop_strategy: LoopStrategy = Field(default_factory=LoopStrategy)
    graph_nodes: list[GraphNode] = Field(
        default_factory=lambda: [GraphNode(id="node_1", role="coder", next=[])]
    )


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


class TraceStep(BaseModel):
    step: int
    node: str
    action: str  # EDIT_FILE, RUN_TEST, RETRY, THINK
    status: StepStatus
    memory_used: int
    warning: str | None = None
    reflection: str | None = None  # i18n key, e.g. "reflect_test_fail"


class FailureEvent(BaseModel):
    reason: FailureReason
    step: int


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
    failure_events: list[FailureEvent] = []
    topology: TopologyInfo | None = None


# ---------------------------------------------------------------------------
# Level configuration
# ---------------------------------------------------------------------------


class LevelInfo(BaseModel):
    id: str
    name: str
    description: str
    unlocked_harness: list[str]  # e.g. ["workspace", "sandbox", "git", "memory"]
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
