"""Tests for the simulation engine: failure injection, determinism, Monte Carlo."""

import random

import pytest

from app.engine import SimulationEngine
from app.models import (
    AgentBlueprint,
    FailureReason,
    GraphEdge,
    GraphNode,
    GraphSpec,
    HarnessConfig,
    LoopConfig,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def full_harness(**overrides) -> HarnessConfig:
    base = dict(
        has_context_injection=True,
        has_tool_surface=True,
        has_persistence=True,
        has_budget_guard=False,
        has_sandbox_isolation=True,
        has_tracing=True,
        memory_capacity=5,
    )
    base.update(overrides)
    return HarnessConfig(**base)


def make_blueprint(
    level_id: str = "level_1_raw",
    run_seed: int = 42,
    has_context_injection: bool = False,
    has_tool_surface: bool = False,
    has_persistence: bool = False,
    has_budget_guard: bool = False,
    token_budget_cap: int | None = None,
    has_sandbox_isolation: bool = False,
    has_tracing: bool = False,
    memory_capacity: int = 3,
    loop_enabled: bool = False,
    evidence: str = "none",
    feedback: str = "none",
    stop_on: str = "agent_says_done",
    state_policy: str = "stateless",
    max_iterations: int = 1,
    graph: GraphSpec | None = None,
    nodes: list[GraphNode] | None = None,
    edges: list[GraphEdge] | None = None,
    checkpointing: bool = False,
) -> AgentBlueprint:
    if graph is None:
        graph = GraphSpec(
            nodes=nodes or [GraphNode(id="node_1", role="coder")],
            edges=edges or [],
            checkpointing=checkpointing,
        )
    return AgentBlueprint(
        level_id=level_id,
        run_seed=run_seed,
        harness=HarnessConfig(
            has_context_injection=has_context_injection,
            has_tool_surface=has_tool_surface,
            has_persistence=has_persistence,
            has_budget_guard=has_budget_guard,
            token_budget_cap=token_budget_cap,
            has_sandbox_isolation=has_sandbox_isolation,
            has_tracing=has_tracing,
            memory_capacity=memory_capacity,
        ),
        loop=LoopConfig(
            enabled=loop_enabled,
            evidence=evidence,  # type: ignore[arg-type]
            feedback=feedback,  # type: ignore[arg-type]
            stop_on=stop_on,  # type: ignore[arg-type]
            state_policy=state_policy,  # type: ignore[arg-type]
            max_iterations=max_iterations,
        ),
        graph=graph,
    )


def chain_graph() -> GraphSpec:
    return GraphSpec(
        nodes=[
            GraphNode(id="n1", role="planner"),
            GraphNode(id="n2", role="coder"),
            GraphNode(id="n3", role="reviewer"),
        ],
        edges=[
            GraphEdge(source="n1", target="n2"),
            GraphEdge(source="n2", target="n3"),
        ],
        entry="n1",
    )


def feedback_graph() -> GraphSpec:
    return GraphSpec(
        nodes=[
            GraphNode(id="n1", role="planner"),
            GraphNode(id="n2", role="coder"),
            GraphNode(id="n3", role="reviewer"),
        ],
        edges=[
            GraphEdge(source="n1", target="n2"),
            GraphEdge(source="n2", target="n3"),
            GraphEdge(source="n3", target="n2", condition="on_review_reject"),
        ],
        entry="n1",
    )


def parallel_graph() -> GraphSpec:
    return GraphSpec(
        nodes=[
            GraphNode(id="p", role="planner"),
            GraphNode(id="c1", role="coder"),
            GraphNode(id="c2", role="coder"),
            GraphNode(id="r", role="reviewer"),
        ],
        edges=[
            GraphEdge(source="p", target="c1"),
            GraphEdge(source="p", target="c2"),
            GraphEdge(source="c1", target="r"),
            GraphEdge(source="c2", target="r"),
        ],
        entry="p",
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
        assert t1.run_id != t2.run_id


# ---------------------------------------------------------------------------
# Harness quality
# ---------------------------------------------------------------------------


class TestHarnessQuality:
    def test_no_harness(self):
        bp = make_blueprint(memory_capacity=3)
        assert SimulationEngine._harness_quality(bp.harness) == pytest.approx(0.15)

    def test_full_harness_max_memory(self):
        h = full_harness(has_budget_guard=True, memory_capacity=10)
        # 5 effect dims * 0.1 + 0.05*10 = 1.0
        assert SimulationEngine._harness_quality(h) == pytest.approx(1.0)

    def test_tracing_does_not_affect_quality(self):
        h_off = full_harness(has_tracing=False, has_budget_guard=True, memory_capacity=5)
        h_on = full_harness(has_tracing=True, has_budget_guard=True, memory_capacity=5)
        assert SimulationEngine._harness_quality(h_off) == SimulationEngine._harness_quality(
            h_on
        )

    def test_memory_capped_at_10(self):
        h = HarnessConfig(memory_capacity=10)
        q10 = SimulationEngine._harness_quality(h)
        assert q10 == pytest.approx(0.5)


# ---------------------------------------------------------------------------
# Harness dimensions
# ---------------------------------------------------------------------------


class TestHarnessDimensions:
    def test_no_tool_surface_causes_hallucination(self):
        bp = make_blueprint(
            has_tool_surface=False,
            has_sandbox_isolation=True,
            has_persistence=True,
            memory_capacity=5,
        )
        engine = SimulationEngine()
        count = 0
        for i in range(200):
            trace = engine.simulate(bp, seed=1000 + i)
            if trace.failure_reason == FailureReason.HALLUCINATED_TOOL:
                count += 1
        assert count > 0

    def test_tool_surface_eliminates_hallucination(self):
        bp = make_blueprint(
            has_context_injection=True,
            has_tool_surface=True,
            has_persistence=True,
            has_sandbox_isolation=True,
            memory_capacity=5,
        )
        engine = SimulationEngine()
        count = 0
        total = 500
        for i in range(total):
            trace = engine.simulate(bp, seed=2000 + i)
            if trace.failure_reason == FailureReason.HALLUCINATED_TOOL:
                count += 1
        assert count < total * 0.15


# ---------------------------------------------------------------------------
# Failure injection — individual modes
# ---------------------------------------------------------------------------


class TestFailureHallucinatedTool:
    def test_level_1_often_fails_with_hallucination(self):
        bp = make_blueprint(level_id="level_1_raw", run_seed=42, memory_capacity=3)
        engine = SimulationEngine()
        count = 0
        for seed_offset in range(200):
            trace = engine.simulate(bp, seed=1000 + seed_offset)
            if trace.failure_reason == FailureReason.HALLUCINATED_TOOL:
                count += 1
        assert count > 0

    def test_with_tool_surface_no_hallucination(self):
        bp = make_blueprint(
            level_id="level_2_harness",
            has_context_injection=True,
            has_tool_surface=True,
            has_persistence=True,
            has_sandbox_isolation=True,
            memory_capacity=5,
        )
        engine = SimulationEngine()
        count = 0
        total = 500
        for seed_offset in range(total):
            trace = engine.simulate(bp, seed=2000 + seed_offset)
            if trace.failure_reason == FailureReason.HALLUCINATED_TOOL:
                count += 1
        assert count < total * 0.15


class TestFailureFileCorrosion:
    def test_no_persistence_many_edits_causes_corrosion(self):
        bp = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=False,
            memory_capacity=5,
        )
        engine = SimulationEngine()
        count = 0
        for seed_offset in range(500):
            trace = engine.simulate(bp, seed=3000 + seed_offset)
            if trace.failure_reason == FailureReason.FILE_CORROSION:
                count += 1
        assert count > 0

    def test_with_persistence_no_corrosion(self):
        bp = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            memory_capacity=5,
        )
        engine = SimulationEngine()
        count = 0
        for seed_offset in range(500):
            trace = engine.simulate(bp, seed=4000 + seed_offset)
            if trace.failure_reason == FailureReason.FILE_CORROSION:
                count += 1
        assert count == 0


class TestFailureMemoryStackOverflow:
    def test_low_memory_can_overflow(self):
        bp = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            memory_capacity=2,
        )
        engine = SimulationEngine()
        count = 0
        for seed_offset in range(500):
            trace = engine.simulate(bp, seed=5000 + seed_offset)
            if trace.failure_reason == FailureReason.MEMORY_STACK_OVERFLOW:
                count += 1
        assert count > 0

    def test_high_memory_no_overflow(self):
        bp = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            memory_capacity=10,
        )
        engine = SimulationEngine()
        count = 0
        for seed_offset in range(500):
            trace = engine.simulate(bp, seed=6000 + seed_offset)
            if trace.failure_reason == FailureReason.MEMORY_STACK_OVERFLOW:
                count += 1
        assert count == 0


class TestFailureTaskAbandoned:
    def test_no_loop_test_fails(self):
        bp = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            memory_capacity=5,
            loop_enabled=False,
        )
        engine = SimulationEngine()
        count = 0
        for seed_offset in range(500):
            trace = engine.simulate(bp, seed=7000 + seed_offset)
            if trace.failure_reason == FailureReason.TASK_ABANDONED:
                count += 1
        assert count > 0

    def test_with_loop_no_abandoned(self):
        bp = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            memory_capacity=5,
            loop_enabled=True,
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=3,
        )
        engine = SimulationEngine()
        count = 0
        for seed_offset in range(500):
            trace = engine.simulate(bp, seed=8000 + seed_offset)
            if trace.failure_reason == FailureReason.TASK_ABANDONED:
                count += 1
        assert count == 0


class TestFailureInfiniteLoop:
    def test_loop_can_trap(self):
        bp = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            memory_capacity=5,
            loop_enabled=True,
            evidence="none",
            feedback="none",
            stop_on="evidence_pass",
            max_iterations=2,
        )
        engine = SimulationEngine()
        count = 0
        for seed_offset in range(500):
            trace = engine.simulate(bp, seed=9000 + seed_offset)
            if trace.failure_reason == FailureReason.INFINITE_LOOP_TRAP:
                count += 1
        assert count > 0


# ---------------------------------------------------------------------------
# Evidence / stop conditions
# ---------------------------------------------------------------------------


class TestEvidenceStop:
    def test_agent_says_done_ungrounded(self):
        """stop_on=agent_says_done → UNGROUNDED_STOP dominates."""
        bp = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            has_context_injection=True,
            memory_capacity=8,
            loop_enabled=True,
            evidence="none",
            feedback="none",
            stop_on="agent_says_done",
            max_iterations=3,
        )
        engine = SimulationEngine()
        ungrounded = 0
        total = 200
        for i in range(total):
            trace = engine.simulate(bp, seed=15000 + i)
            if trace.failure_reason == FailureReason.UNGROUNDED_STOP:
                ungrounded += 1
        assert ungrounded > total * 0.5

    def test_evidence_pass_can_succeed(self):
        """stop_on=evidence_pass with reflexion can succeed."""
        bp = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            has_context_injection=True,
            memory_capacity=8,
            loop_enabled=True,
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=5,
        )
        engine = SimulationEngine()
        result = engine.monte_carlo(bp, num_runs=200)
        assert result["success_rate"] >= 0.5
        found_evidence = False
        for t in result["sample_traces"]:
            actions = {s.action for s in t.steps}
            if "CHECK_EVIDENCE" in actions or "STOP" in actions:
                found_evidence = True
                break
        assert found_evidence


# ---------------------------------------------------------------------------
# Loop simulation
# ---------------------------------------------------------------------------


class TestLoopSimulation:
    def test_high_quality_usually_succeeds(self):
        engine = SimulationEngine(seed=42)
        successes = 0
        total = 500
        for i in range(total):
            engine.rng = random.Random(42 + i)
            ok, _, _ = engine._simulate_loop(10, 0.8, "reflexion")
            if ok:
                successes += 1
        assert successes > total * 0.7

    def test_low_quality_often_fails(self):
        engine = SimulationEngine(seed=42)
        failures = 0
        total = 500
        for i in range(total):
            engine.rng = random.Random(42 + i)
            ok, _, _ = engine._simulate_loop(3, 0.1, "reflexion")
            if not ok:
                failures += 1
        assert failures > 20


# ---------------------------------------------------------------------------
# Monte Carlo
# ---------------------------------------------------------------------------


class TestMonteCarlo:
    def test_returns_correct_structure(self):
        bp = make_blueprint(
            run_seed=1,
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            memory_capacity=5,
        )
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
            GraphNode(id="n1", role="planner"),
            GraphNode(id="n2", role="coder"),
            GraphNode(id="n3", role="reviewer"),
        ]
        assert SimulationEngine._has_graph_bonus(nodes) is True

    def test_has_graph_bonus_false_for_fewer_nodes(self):
        nodes = [GraphNode(id="n1", role="coder")]
        assert SimulationEngine._has_graph_bonus(nodes) is False

    def test_has_graph_bonus_false_for_wrong_roles(self):
        nodes = [
            GraphNode(id="n1", role="planner"),
            GraphNode(id="n2", role="tester"),
            GraphNode(id="n3", role="coder"),
        ]
        assert SimulationEngine._has_graph_bonus(nodes) is False

    def test_graph_level_simulation(self):
        bp = make_blueprint(
            level_id="level_4_graph",
            run_seed=42,
            has_context_injection=True,
            has_tool_surface=True,
            has_persistence=True,
            has_sandbox_isolation=True,
            has_budget_guard=True,
            memory_capacity=9,
            loop_enabled=True,
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=5,
            graph=chain_graph(),
        )
        engine = SimulationEngine()
        result = engine.monte_carlo(bp, num_runs=200)
        assert result["success_rate"] >= 0.70

    def test_empty_graph_defaults_to_single_coder(self):
        bp = AgentBlueprint(
            level_id="level_1_raw",
            run_seed=42,
            harness=HarnessConfig(has_tool_surface=True, memory_capacity=5),
            loop=LoopConfig(enabled=False),
            graph=GraphSpec(),
        )
        engine = SimulationEngine()
        trace = engine.simulate(bp, seed=42)
        assert any(s.node == "node_1" for s in trace.steps)


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
            GraphNode(id="a", role="planner"),
            GraphNode(id="b", role="coder"),
            GraphNode(id="c", role="reviewer"),
        ]
        edges = [
            GraphEdge(source="a", target="b"),
            GraphEdge(source="b", target="c"),
        ]
        order = SimulationEngine._resolve_node_order(nodes, edges)
        assert [n.id for n in order] == ["a", "b", "c"]

    def test_single_node(self):
        nodes = [GraphNode(id="only", role="coder")]
        order = SimulationEngine._resolve_node_order(nodes, [])
        assert [n.id for n in order] == ["only"]

    def test_disconnected_nodes(self):
        nodes = [
            GraphNode(id="a", role="coder"),
            GraphNode(id="b", role="tester"),
        ]
        order = SimulationEngine._resolve_node_order(nodes, [])
        assert len(order) == 2
        assert {n.id for n in order} == {"a", "b"}


# ---------------------------------------------------------------------------
# Topology analysis
# ---------------------------------------------------------------------------


class TestTopologyAnalysis:
    def test_single(self):
        nodes = [GraphNode(id="n1", role="coder")]
        topo = SimulationEngine._analyze_topology(nodes, [])
        assert topo.kind == "single"
        assert topo.has_feedback is False

    def test_chain(self):
        g = chain_graph()
        topo = SimulationEngine._analyze_topology(g.nodes, g.edges)
        assert topo.kind == "chain"
        assert topo.has_feedback is False
        assert topo.parallel_coders == 0

    def test_parallel(self):
        nodes = [
            GraphNode(id="p", role="planner"),
            GraphNode(id="c1", role="coder"),
            GraphNode(id="c2", role="coder"),
            GraphNode(id="t", role="tester"),
        ]
        edges = [
            GraphEdge(source="p", target="c1"),
            GraphEdge(source="p", target="c2"),
            GraphEdge(source="c1", target="t"),
            GraphEdge(source="c2", target="t"),
        ]
        topo = SimulationEngine._analyze_topology(nodes, edges)
        assert topo.kind == "parallel"
        assert topo.parallel_coders >= 2

    def test_feedback(self):
        g = feedback_graph()
        topo = SimulationEngine._analyze_topology(g.nodes, g.edges)
        assert topo.kind == "feedback"
        assert topo.has_feedback is True

    def test_feedback_via_on_fail_edge(self):
        nodes = [
            GraphNode(id="c", role="coder"),
            GraphNode(id="t", role="tester"),
        ]
        edges = [
            GraphEdge(source="c", target="t"),
            GraphEdge(source="t", target="c", condition="on_fail"),
        ]
        topo = SimulationEngine._analyze_topology(nodes, edges)
        assert topo.has_feedback is True

    def test_isolated(self):
        nodes = [
            GraphNode(id="n1", role="planner"),
            GraphNode(id="n2", role="coder"),
            GraphNode(id="orphan", role="tester"),
        ]
        edges = [GraphEdge(source="n1", target="n2")]
        topo = SimulationEngine._analyze_topology(nodes, edges)
        assert "orphan" in topo.isolated_nodes


# ---------------------------------------------------------------------------
# Memory isolation
# ---------------------------------------------------------------------------


class TestMemoryIsolation:
    def test_multi_agent_full_capacity_per_node(self):
        bp = make_blueprint(
            level_id="level_4_graph",
            run_seed=42,
            has_context_injection=True,
            has_tool_surface=True,
            has_persistence=True,
            has_sandbox_isolation=True,
            memory_capacity=6,
            loop_enabled=True,
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=3,
            graph=chain_graph(),
        )
        engine = SimulationEngine()
        max_coder_mem = 0
        for seed_offset in range(50):
            trace = engine.simulate(bp, seed=10000 + seed_offset)
            for step in trace.steps:
                if step.node == "n2":
                    max_coder_mem = max(max_coder_mem, step.memory_used)
        assert max_coder_mem > 2


# ---------------------------------------------------------------------------
# Blind evidence vs reflexion
# ---------------------------------------------------------------------------


class TestEvidenceFeedback:
    def test_blind_lower_success_than_reflexion(self):
        engine = SimulationEngine()
        total = 500
        blind_ok = 0
        reflex_ok = 0
        hq = 0.1
        for i in range(total):
            engine.rng = random.Random(20000 + i)
            ok_b, _, _ = engine._simulate_loop(4, hq, "blind")
            engine.rng = random.Random(20000 + i)
            ok_r, _, _ = engine._simulate_loop(4, hq, "reflexion")
            if ok_b:
                blind_ok += 1
            if ok_r:
                reflex_ok += 1
        assert reflex_ok > blind_ok
        assert reflex_ok - blind_ok > total * 0.1

    def test_one_retry_equal(self):
        engine = SimulationEngine()
        total = 200
        blind_ok = 0
        reflex_ok = 0
        for i in range(total):
            engine.rng = random.Random(30000 + i)
            ok_b, _, _ = engine._simulate_loop(1, 0.3, "blind")
            engine.rng = random.Random(30000 + i)
            ok_r, _, _ = engine._simulate_loop(1, 0.3, "reflexion")
            if ok_b:
                blind_ok += 1
            if ok_r:
                reflex_ok += 1
        assert blind_ok == reflex_ok


# ---------------------------------------------------------------------------
# Reflections
# ---------------------------------------------------------------------------


class TestReflections:
    def test_reflexion_produces_reflection_text(self):
        bp = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            has_context_injection=True,
            memory_capacity=8,
            loop_enabled=True,
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=5,
        )
        engine = SimulationEngine()
        found = False
        for seed_offset in range(100):
            trace = engine.simulate(bp, seed=40000 + seed_offset)
            retries = [s for s in trace.steps if s.action == "RETRY" and s.reflection]
            if retries:
                found = True
                assert retries[0].reflection.startswith("reflect_")
                break
        assert found, "Expected at least one RETRY with reflection in reflexion mode"

    def test_no_evidence_no_reflection(self):
        bp = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            has_context_injection=True,
            memory_capacity=8,
            loop_enabled=True,
            evidence="none",
            feedback="none",
            stop_on="evidence_pass",
            max_iterations=5,
        )
        engine = SimulationEngine()
        for seed_offset in range(50):
            trace = engine.simulate(bp, seed=41000 + seed_offset)
            for s in trace.steps:
                assert s.reflection is None


# ---------------------------------------------------------------------------
# Feedback rework & parallel coders
# ---------------------------------------------------------------------------


class TestFeedbackRework:
    def test_feedback_improves_success_rate(self):
        chain = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            memory_capacity=5,
            loop_enabled=False,
            graph=chain_graph(),
        )
        feedback = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            memory_capacity=5,
            loop_enabled=False,
            graph=feedback_graph(),
        )
        engine = SimulationEngine()
        r_chain = engine.monte_carlo(chain, num_runs=200)
        r_fb = engine.monte_carlo(feedback, num_runs=200)
        assert r_fb["success_rate"] >= r_chain["success_rate"]


class TestParallelCoders:
    def test_parallel_improves_or_matches_success(self):
        single = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            has_context_injection=True,
            memory_capacity=6,
            loop_enabled=True,
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=3,
            graph=chain_graph(),
        )
        parallel = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            has_context_injection=True,
            memory_capacity=6,
            loop_enabled=True,
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=3,
            graph=parallel_graph(),
        )
        engine = SimulationEngine()
        r_single = engine.monte_carlo(single, num_runs=200)
        r_parallel = engine.monte_carlo(parallel, num_runs=200)
        assert r_parallel["success_rate"] >= r_single["success_rate"] - 0.05
        sample = r_parallel["sample_traces"][0]
        assert sample.topology is not None
        assert sample.topology.kind == "parallel"


# ---------------------------------------------------------------------------
# Budget guard
# ---------------------------------------------------------------------------


class TestBudgetGuard:
    def test_budget_exhausted_when_cap_low(self):
        bp = make_blueprint(
            has_tool_surface=True,
            has_sandbox_isolation=True,
            has_persistence=True,
            has_budget_guard=True,
            token_budget_cap=100,
            memory_capacity=5,
            loop_enabled=False,
        )
        engine = SimulationEngine()
        count = 0
        for i in range(50):
            trace = engine.simulate(bp, seed=50000 + i)
            if trace.failure_reason == FailureReason.BUDGET_EXHAUSTED:
                count += 1
        assert count > 0
