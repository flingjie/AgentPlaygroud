"""Tests for data models: serialisation, deserialisation, and validation."""

import pytest
from pydantic import ValidationError

from app.models import (
    AgentBlueprint,
    FailureReason,
    GraphEdge,
    GraphNode,
    GraphSpec,
    HarnessConfig,
    LevelInfo,
    LoopConfig,
    MonteCarloRequest,
    MonteCarloResponse,
    RunTrace,
    StepStatus,
    TraceStep,
)


# ---------------------------------------------------------------------------
# AgentBlueprint
# ---------------------------------------------------------------------------


class TestAgentBlueprint:
    def test_default_blueprint(self):
        bp = AgentBlueprint(level_id="level_1_raw")
        assert bp.level_id == "level_1_raw"
        assert bp.run_seed is None
        assert bp.harness == HarnessConfig()
        assert bp.loop == LoopConfig()
        assert bp.graph == GraphSpec()

    def test_full_blueprint_roundtrip(self):
        bp = AgentBlueprint(
            level_id="level_4_graph",
            run_seed=42,
            harness=HarnessConfig(
                has_context_injection=True,
                has_tool_surface=True,
                has_persistence=True,
                has_budget_guard=True,
                has_sandbox_isolation=True,
                has_tracing=True,
                memory_capacity=9,
            ),
            loop=LoopConfig(
                enabled=True,
                evidence="test_runner",
                feedback="reflexion",
                stop_on="evidence_pass",
                max_iterations=5,
            ),
            graph=GraphSpec(
                nodes=[
                    GraphNode(id="n1", role="planner", state_writes=["plan"]),
                    GraphNode(id="n2", role="coder", state_writes=["diff"]),
                    GraphNode(id="n3", role="reviewer"),
                ],
                edges=[
                    GraphEdge(source="n1", target="n2"),
                    GraphEdge(source="n2", target="n3"),
                ],
                entry="n1",
                checkpointing=True,
                state_schema=["plan", "diff", "test_report"],
            ),
        )

        js = bp.model_dump_json()
        restored = AgentBlueprint.model_validate_json(js)
        assert restored == bp

    def test_memory_capacity_bounds(self):
        with pytest.raises(ValidationError):
            HarnessConfig(memory_capacity=0)
        with pytest.raises(ValidationError):
            HarnessConfig(memory_capacity=11)

    def test_memory_capacity_valid(self):
        h = HarnessConfig(memory_capacity=1)
        assert h.memory_capacity == 1
        h = HarnessConfig(memory_capacity=10)
        assert h.memory_capacity == 10

    def test_loop_max_iterations_bounds(self):
        with pytest.raises(ValidationError):
            LoopConfig(max_iterations=0)
        with pytest.raises(ValidationError):
            LoopConfig(max_iterations=11)

    def test_new_failure_reasons(self):
        assert FailureReason.BUDGET_EXHAUSTED.value == "BUDGET_EXHAUSTED"
        assert FailureReason.UNGROUNDED_STOP.value == "UNGROUNDED_STOP"


# ---------------------------------------------------------------------------
# RunTrace / TraceStep
# ---------------------------------------------------------------------------


class TestRunTrace:
    def test_empty_trace(self):
        trace = RunTrace(run_id="abc123", status="SUCCESS")
        assert trace.run_id == "abc123"
        assert trace.status == "SUCCESS"
        assert trace.failure_reason == FailureReason.NONE
        assert trace.cost_tokens == 0
        assert trace.steps == []

    def test_full_trace_roundtrip(self):
        trace = RunTrace(
            run_id="run-001",
            status="FAILED",
            failure_reason=FailureReason.HALLUCINATED_TOOL,
            cost_tokens=12500,
            steps=[
                TraceStep(
                    step=1,
                    node="node_1",
                    action="THINK",
                    status=StepStatus.SUCCESS,
                    memory_used=1,
                ),
                TraceStep(
                    step=2,
                    node="node_1",
                    action="EDIT_FILE",
                    status=StepStatus.FAIL,
                    memory_used=3,
                    warning="Agent attempted to use a tool that does not exist",
                ),
                TraceStep(
                    step=3,
                    node="node_1",
                    action="CHECK_EVIDENCE",
                    status=StepStatus.FAIL,
                    memory_used=3,
                ),
                TraceStep(
                    step=4,
                    node="node_1",
                    action="STOP",
                    status=StepStatus.FAIL,
                    memory_used=3,
                ),
            ],
        )

        js = trace.model_dump_json()
        restored = RunTrace.model_validate_json(js)
        assert restored == trace
        assert restored.failure_reason == FailureReason.HALLUCINATED_TOOL
        assert len(restored.steps) == 4


# ---------------------------------------------------------------------------
# LevelInfo
# ---------------------------------------------------------------------------


class TestLevelInfo:
    def test_level_info_fields(self):
        level = LevelInfo(
            id="test_level",
            name="Test Level",
            description="A test",
            unlocked_harness=["tool_surface"],
            unlocked_loop=False,
            unlocked_graph=False,
            target_success_rate=0.5,
            token_budget=10000,
        )
        assert level.id == "test_level"
        assert level.unlocked_harness == ["tool_surface"]


# ---------------------------------------------------------------------------
# Monte Carlo request / response
# ---------------------------------------------------------------------------


class TestMonteCarlo:
    def test_default_num_runs(self):
        req = MonteCarloRequest(blueprint=AgentBlueprint(level_id="level_1_raw"))
        assert req.num_runs == 100

    def test_response_structure(self):
        resp = MonteCarloResponse(
            success_rate=0.85,
            avg_tokens=14200.0,
            failure_distribution={"HALLUCINATED_TOOL": 10, "NONE": 0},
            sample_traces=[],
        )
        assert resp.success_rate == 0.85
        assert resp.avg_tokens == 14200.0
