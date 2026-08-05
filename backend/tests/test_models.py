"""Tests for data models: serialisation, deserialisation, and validation."""

import pytest
from pydantic import ValidationError

from app.models import (
    AgentBlueprint,
    FailureReason,
    GraphNode,
    HarnessConfig,
    LevelInfo,
    LoopStrategy,
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
        assert bp.loop_strategy == LoopStrategy()
        assert bp.graph_nodes == [GraphNode(id="node_1", role="coder", next=[])]

    def test_full_blueprint_roundtrip(self):
        bp = AgentBlueprint(
            level_id="level_4_graph",
            run_seed=42,
            harness=HarnessConfig(
                has_workspace=True,
                has_sandbox=True,
                has_git=True,
                memory_capacity=9,
            ),
            loop_strategy=LoopStrategy(
                type="react_reflexion",
                max_retries=5,
                stop_condition="test_pass",
            ),
            graph_nodes=[
                GraphNode(id="n1", role="planner", next=["n2"]),
                GraphNode(id="n2", role="coder", next=["n3"]),
                GraphNode(id="n3", role="reviewer", next=[]),
            ],
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
            ],
        )

        js = trace.model_dump_json()
        restored = RunTrace.model_validate_json(js)
        assert restored == trace
        assert restored.failure_reason == FailureReason.HALLUCINATED_TOOL
        assert len(restored.steps) == 2


# ---------------------------------------------------------------------------
# LevelInfo
# ---------------------------------------------------------------------------


class TestLevelInfo:
    def test_level_info_fields(self):
        level = LevelInfo(
            id="test_level",
            name="Test Level",
            description="A test",
            unlocked_harness=["workspace"],
            unlocked_loop=False,
            unlocked_graph=False,
            target_success_rate=0.5,
            token_budget=10000,
        )
        assert level.id == "test_level"
        assert level.unlocked_harness == ["workspace"]


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
