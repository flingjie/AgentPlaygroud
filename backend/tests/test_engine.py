"""Tests for the simulation engine: failure injection, determinism, Monte Carlo."""

import pytest

from app.engine import SimulationEngine
from app.models import (
    AgentBlueprint,
    FailureReason,
    GraphNode,
    HarnessConfig,
    LoopStrategy,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_blueprint(
    level_id: str = "level_1_raw",
    run_seed: int = 42,
    has_workspace: bool = False,
    has_sandbox: bool = False,
    has_git: bool = False,
    memory_capacity: int = 3,
    loop_type: str = "none",
    max_retries: int = 1,
    stop_condition: str = "none",
    graph_nodes: list[GraphNode] | None = None,
) -> AgentBlueprint:
    return AgentBlueprint(
        level_id=level_id,
        run_seed=run_seed,
        harness=HarnessConfig(
            has_workspace=has_workspace,
            has_sandbox=has_sandbox,
            has_git=has_git,
            memory_capacity=memory_capacity,
        ),
        loop_strategy=LoopStrategy(
            type=loop_type,  # type: ignore[arg-type]
            max_retries=max_retries,
            stop_condition=stop_condition,  # type: ignore[arg-type]
        ),
        graph_nodes=graph_nodes or [GraphNode(id="node_1", role="coder", next=[])],
    )


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------


class TestDeterminism:
    def test_same_seed_same_result(self):
        bp = make_blueprint(run_seed=123)
        engine1 = SimulationEngine()
        engine2 = SimulationEngine()
        t1 = engine1.simulate(bp, seed=123)
        t2 = engine2.simulate(bp, seed=123)
        assert t1 == t2

    def test_different_seed_different_result(self):
        bp = make_blueprint(run_seed=123)
        engine = SimulationEngine()
        t1 = engine.simulate(bp, seed=123)
        t2 = engine.simulate(bp, seed=456)
        # They *could* coincidentally match, but with the default blueprint
        # having randomness in failure injection, they should differ.
        assert t1.run_id != t2.run_id


# ---------------------------------------------------------------------------
# Harness quality
# ---------------------------------------------------------------------------


class TestHarnessQuality:
    def test_no_harness(self):
        bp = make_blueprint(has_workspace=False, has_sandbox=False, has_git=False, memory_capacity=3)
        assert SimulationEngine._harness_quality(bp.harness) == pytest.approx(0.15)  # 0 + 0.05*3

    def test_full_harness_max_memory(self):
        bp = make_blueprint(has_workspace=True, has_sandbox=True, has_git=True, memory_capacity=10)
        assert SimulationEngine._harness_quality(bp.harness) == pytest.approx(0.8)  # 0.3 + 0.5

    def test_memory_capped_at_10(self):
        """The _harness_quality formula caps memory at 10 via min(cap, 10)."""
        # Create a harness config with max valid capacity and verify
        # the formula uses min(capacity, 10) — capacity=10 and capacity=100
        # would give the same result, but we can only test valid inputs.
        h = HarnessConfig(memory_capacity=10)
        q10 = SimulationEngine._harness_quality(h)
        assert q10 == pytest.approx(0.5)  # 0.05 * 10 = 0.5


# ---------------------------------------------------------------------------
# Failure injection — individual modes
# ---------------------------------------------------------------------------


class TestFailureHallucinatedTool:
    def test_level_1_often_fails_with_hallucination(self):
        """Level 1 has no sandbox, no workspace → high hallucination rate."""
        bp = make_blueprint(
            level_id="level_1_raw",
            run_seed=42,
            has_workspace=False,
            has_sandbox=False,
            has_git=False,
            memory_capacity=3,
        )
        engine = SimulationEngine()
        failure_counts = {FailureReason.HALLUCINATED_TOOL: 0}
        for seed_offset in range(200):
            trace = engine.simulate(bp, seed=1000 + seed_offset)
            if trace.failure_reason == FailureReason.HALLUCINATED_TOOL:
                failure_counts[FailureReason.HALLUCINATED_TOOL] += 1
        # At least some should fail with hallucinated tool
        assert failure_counts[FailureReason.HALLUCINATED_TOOL] > 0

    def test_with_sandbox_no_hallucination(self):
        """With sandbox enabled, hallucinated tool failure should not be the
        primary failure mode (though other failures may still occur)."""
        bp = make_blueprint(
            level_id="level_2_harness",
            run_seed=42,
            has_workspace=True,
            has_sandbox=True,
            has_git=True,
            memory_capacity=5,
        )
        engine = SimulationEngine()
        # Run many simulations — HALLUCINATED_TOOL should be rare/absent
        hallucination_count = 0
        total = 500
        for seed_offset in range(total):
            trace = engine.simulate(bp, seed=2000 + seed_offset)
            if trace.failure_reason == FailureReason.HALLUCINATED_TOOL:
                hallucination_count += 1
        # With workspace+sandbox, hallucination should be much less common
        assert hallucination_count < total * 0.15, (
            f"Hallucination rate too high: {hallucination_count}/{total}"
        )


class TestFailureFileCorrosion:
    def test_no_git_many_edits_causes_corrosion(self):
        """Without git, multiple EDIT_FILE actions can cause file corruption."""
        bp = make_blueprint(
            has_workspace=True,
            has_sandbox=True,
            has_git=False,
            memory_capacity=5,
        )
        engine = SimulationEngine()
        corrosion_count = 0
        total = 500
        for seed_offset in range(total):
            trace = engine.simulate(bp, seed=3000 + seed_offset)
            if trace.failure_reason == FailureReason.FILE_CORROSION:
                corrosion_count += 1
        assert corrosion_count > 0

    def test_with_git_no_corrosion(self):
        """With git enabled, file corrosion should be eliminated."""
        bp = make_blueprint(
            has_workspace=True,
            has_sandbox=True,
            has_git=True,
            memory_capacity=5,
        )
        engine = SimulationEngine()
        corrosion_count = 0
        total = 500
        for seed_offset in range(total):
            trace = engine.simulate(bp, seed=4000 + seed_offset)
            if trace.failure_reason == FailureReason.FILE_CORROSION:
                corrosion_count += 1
        assert corrosion_count == 0


class TestFailureMemoryStackOverflow:
    def test_low_memory_can_overflow(self):
        """With memory_capacity <= 3 and many steps, overflow can occur."""
        bp = make_blueprint(
            has_workspace=True,
            has_sandbox=True,
            has_git=True,
            memory_capacity=2,
        )
        engine = SimulationEngine()
        overflow_count = 0
        total = 500
        for seed_offset in range(total):
            trace = engine.simulate(bp, seed=5000 + seed_offset)
            if trace.failure_reason == FailureReason.MEMORY_STACK_OVERFLOW:
                overflow_count += 1
        assert overflow_count > 0

    def test_high_memory_no_overflow(self):
        """With high memory capacity, overflow should be rare."""
        bp = make_blueprint(
            has_workspace=True,
            has_sandbox=True,
            has_git=True,
            memory_capacity=10,
        )
        engine = SimulationEngine()
        overflow_count = 0
        total = 500
        for seed_offset in range(total):
            trace = engine.simulate(bp, seed=6000 + seed_offset)
            if trace.failure_reason == FailureReason.MEMORY_STACK_OVERFLOW:
                overflow_count += 1
        # Should still be 0 for capacity=10
        assert overflow_count == 0


class TestFailureTaskAbandoned:
    def test_no_loop_test_fails(self):
        """Without a loop, a single test failure abandons the task."""
        bp = make_blueprint(
            has_workspace=True,
            has_sandbox=True,
            has_git=True,
            memory_capacity=5,
            loop_type="none",
        )
        engine = SimulationEngine()
        abandoned_count = 0
        total = 500
        for seed_offset in range(total):
            trace = engine.simulate(bp, seed=7000 + seed_offset)
            if trace.failure_reason == FailureReason.TASK_ABANDONED:
                abandoned_count += 1
        assert abandoned_count > 0

    def test_with_loop_no_abandoned(self):
        """With a loop, TASK_ABANDONED should never occur — the agent retries."""
        bp = make_blueprint(
            has_workspace=True,
            has_sandbox=True,
            has_git=True,
            memory_capacity=5,
            loop_type="react_reflexion",
            max_retries=3,
            stop_condition="test_pass",
        )
        engine = SimulationEngine()
        abandoned_count = 0
        total = 500
        for seed_offset in range(total):
            trace = engine.simulate(bp, seed=8000 + seed_offset)
            if trace.failure_reason == FailureReason.TASK_ABANDONED:
                abandoned_count += 1
        assert abandoned_count == 0


class TestFailureInfiniteLoop:
    def test_loop_without_stop_condition_can_trap(self):
        """Without stop_condition, retries may run out → INFINITE_LOOP_TRAP."""
        bp = make_blueprint(
            has_workspace=True,
            has_sandbox=True,
            has_git=True,
            memory_capacity=5,
            loop_type="react_reflexion",
            max_retries=2,
            stop_condition="none",
        )
        engine = SimulationEngine()
        loop_trap_count = 0
        total = 500
        for seed_offset in range(total):
            trace = engine.simulate(bp, seed=9000 + seed_offset)
            if trace.failure_reason == FailureReason.INFINITE_LOOP_TRAP:
                loop_trap_count += 1
        assert loop_trap_count > 0


# ---------------------------------------------------------------------------
# Loop simulation
# ---------------------------------------------------------------------------


class TestLoopSimulation:
    def test_high_quality_usually_succeeds(self):
        engine = SimulationEngine(seed=42)
        successes = 0
        total = 500
        for i in range(total):
            ok, retries, reason = engine._simulate_loop(max_retries=10, harness_quality=0.8)
            if ok:
                successes += 1
        assert successes > total * 0.7  # high quality → high success

    def test_low_quality_often_fails(self):
        engine = SimulationEngine(seed=42)
        failures = 0
        total = 500
        for i in range(total):
            ok, _, reason = engine._simulate_loop(max_retries=3, harness_quality=0.1)
            if not ok:
                failures += 1
        # With harness_quality=0.1 and 3 retries:
        #   error_rate progression: 0.7 → 0.45 → 0.2
        #   P(all fail) ≈ 0.063, so expect ~31 out of 500
        assert failures > 20


# ---------------------------------------------------------------------------
# Monte Carlo
# ---------------------------------------------------------------------------


class TestMonteCarlo:
    def test_returns_correct_structure(self):
        bp = make_blueprint(run_seed=1, has_workspace=True, has_sandbox=True, has_git=True, memory_capacity=5)
        engine = SimulationEngine()
        result = engine.monte_carlo(bp, num_runs=50)
        assert "success_rate" in result
        assert "avg_tokens" in result
        assert "failure_distribution" in result
        assert "sample_traces" in result
        assert 0.0 <= result["success_rate"] <= 1.0
        assert len(result["sample_traces"]) == 5
        assert result["avg_tokens"] > 0

    def test_deterministic_monte_carlo(self):
        bp = make_blueprint(run_seed=42)
        engine1 = SimulationEngine()
        engine2 = SimulationEngine()
        r1 = engine1.monte_carlo(bp, num_runs=20)
        r2 = engine2.monte_carlo(bp, num_runs=20)
        assert r1["success_rate"] == r2["success_rate"]
        assert r1["avg_tokens"] == r2["avg_tokens"]
        assert r1["failure_distribution"] == r2["failure_distribution"]


# ---------------------------------------------------------------------------
# Graph bonus (Level 4)
# ---------------------------------------------------------------------------


class TestGraphBonus:
    def test_has_graph_bonus_true(self):
        nodes = [
            GraphNode(id="n1", role="planner", next=["n2"]),
            GraphNode(id="n2", role="coder", next=["n3"]),
            GraphNode(id="n3", role="reviewer", next=[]),
        ]
        assert SimulationEngine._has_graph_bonus(nodes) is True

    def test_has_graph_bonus_false_for_fewer_nodes(self):
        nodes = [GraphNode(id="n1", role="coder", next=[])]
        assert SimulationEngine._has_graph_bonus(nodes) is False

    def test_has_graph_bonus_false_for_wrong_roles(self):
        nodes = [
            GraphNode(id="n1", role="planner", next=["n2"]),
            GraphNode(id="n2", role="tester", next=["n3"]),
            GraphNode(id="n3", role="coder", next=[]),
        ]
        assert SimulationEngine._has_graph_bonus(nodes) is False

    def test_graph_level_simulation(self):
        """Level 4 graph with full harness should have high success rate."""
        bp = make_blueprint(
            level_id="level_4_graph",
            run_seed=42,
            has_workspace=True,
            has_sandbox=True,
            has_git=True,
            memory_capacity=9,
            loop_type="react_reflexion",
            max_retries=5,
            stop_condition="test_pass",
            graph_nodes=[
                GraphNode(id="n1", role="planner", next=["n2"]),
                GraphNode(id="n2", role="coder", next=["n3"]),
                GraphNode(id="n3", role="reviewer", next=[]),
            ],
        )
        engine = SimulationEngine()
        result = engine.monte_carlo(bp, num_runs=200)
        # With full harness + loop + graph, success rate should be strong
        assert result["success_rate"] >= 0.70


# ---------------------------------------------------------------------------
# Streaming
# ---------------------------------------------------------------------------


class TestStreaming:
    def test_stream_yields_steps_and_returns_trace(self):
        bp = make_blueprint(run_seed=42)
        engine = SimulationEngine()
        gen = engine.simulate_stream(bp, seed=42)

        steps = []
        while True:
            try:
                step_or_trace = next(gen)
            except StopIteration as exc:
                trace = exc.value
                break
            steps.append(step_or_trace)

        assert len(steps) > 0
        assert len(steps) == len(trace.steps)
        # Steps yielded should match trace steps
        for i, s in enumerate(steps):
            assert s["step"] == trace.steps[i].step
            assert s["node"] == trace.steps[i].node
            assert s["action"] == trace.steps[i].action


# ---------------------------------------------------------------------------
# Node ordering
# ---------------------------------------------------------------------------


class TestNodeOrdering:
    def test_simple_chain(self):
        nodes = [
            GraphNode(id="a", role="planner", next=["b"]),
            GraphNode(id="b", role="coder", next=["c"]),
            GraphNode(id="c", role="reviewer", next=[]),
        ]
        order = SimulationEngine._resolve_node_order(nodes)
        assert [n.id for n in order] == ["a", "b", "c"]

    def test_single_node(self):
        nodes = [GraphNode(id="only", role="coder", next=[])]
        order = SimulationEngine._resolve_node_order(nodes)
        assert [n.id for n in order] == ["only"]

    def test_disconnected_nodes(self):
        nodes = [
            GraphNode(id="a", role="coder", next=[]),
            GraphNode(id="b", role="tester", next=[]),
        ]
        order = SimulationEngine._resolve_node_order(nodes)
        # Both should appear, order is definition order since both are roots
        assert len(order) == 2
        assert {n.id for n in order} == {"a", "b"}
