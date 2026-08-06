"""Tests for the simulation engine: failure injection, determinism, Monte Carlo."""

import random

import pytest

from app.engine import SimulationEngine, WARNING_NO_RETRY_MECHANISM, WARNING_STALE_CONTEXT
from app.models import (
    AgentBlueprint,
    FailureReason,
    GraphEdge,
    GraphNode,
    GraphSpec,
    HarnessConfig,
    LoopConfig,
    StepStatus,
    TraceStep,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def full_harness(**overrides) -> HarnessConfig:
    base = dict(
        has_tool_registry=True,
        has_retry_policy=True,
        has_timeout_guard=True,
        has_sandbox_isolation=True,
        has_context_manager=True,
        has_state_persistence=True,
        has_permission_layer=True,
        memory_capacity=5,
    )
    base.update(overrides)
    return HarnessConfig(**base)


def make_blueprint(
    level_id: str = "level_1_raw",
    run_seed: int = 42,
    has_tool_registry: bool = False,
    has_retry_policy: bool = False,
    has_timeout_guard: bool = False,
    run_boundary_cap: int | None = None,
    has_sandbox_isolation: bool = False,
    has_context_manager: bool = False,
    has_state_persistence: bool = False,
    has_permission_layer: bool = False,
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
            has_tool_registry=has_tool_registry,
            has_retry_policy=has_retry_policy,
            has_timeout_guard=has_timeout_guard,
            run_boundary_cap=run_boundary_cap,
            has_sandbox_isolation=has_sandbox_isolation,
            has_context_manager=has_context_manager,
            has_state_persistence=has_state_persistence,
            has_permission_layer=has_permission_layer,
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
        h = full_harness(memory_capacity=10)
        # 6 effect dims * 0.1 + 0.05*10 = 1.1
        assert SimulationEngine._harness_quality(h) == pytest.approx(1.1)

    def test_retry_policy_does_not_affect_quality(self):
        h_off = full_harness(has_retry_policy=False, memory_capacity=5)
        h_on = full_harness(has_retry_policy=True, memory_capacity=5)
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
    def test_no_tool_registry_causes_hallucination(self):
        bp = make_blueprint(
            has_tool_registry=False,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            memory_capacity=5,
        )
        engine = SimulationEngine()
        count = 0
        for i in range(200):
            trace = engine.simulate(bp, seed=1000 + i)
            if trace.failure_reason == FailureReason.HALLUCINATION:
                count += 1
        assert count > 0

    def test_tool_registry_eliminates_hallucination(self):
        bp = make_blueprint(
            has_context_manager=True,
            has_tool_registry=True,
            has_state_persistence=True,
            has_sandbox_isolation=True,
            memory_capacity=5,
        )
        engine = SimulationEngine()
        count = 0
        total = 500
        for i in range(total):
            trace = engine.simulate(bp, seed=2000 + i)
            if trace.failure_reason == FailureReason.HALLUCINATION:
                count += 1
        assert count < total * 0.15


# ---------------------------------------------------------------------------
# Failure injection — individual modes
# ---------------------------------------------------------------------------


class TestFailureHallucination:
    def test_level_1_often_fails_with_hallucination(self):
        bp = make_blueprint(level_id="level_1_raw", run_seed=42, memory_capacity=3)
        engine = SimulationEngine()
        count = 0
        for seed_offset in range(200):
            trace = engine.simulate(bp, seed=1000 + seed_offset)
            if trace.failure_reason == FailureReason.HALLUCINATION:
                count += 1
        assert count > 0

    def test_with_tool_registry_no_hallucination(self):
        bp = make_blueprint(
            level_id="level_2_harness",
            has_context_manager=True,
            has_tool_registry=True,
            has_state_persistence=True,
            has_sandbox_isolation=True,
            memory_capacity=5,
        )
        engine = SimulationEngine()
        count = 0
        total = 500
        for seed_offset in range(total):
            trace = engine.simulate(bp, seed=2000 + seed_offset)
            if trace.failure_reason == FailureReason.HALLUCINATION:
                count += 1
        assert count < total * 0.15


class TestFailureFileCorrosion:
    def test_no_persistence_many_edits_causes_corrosion(self):
        bp = make_blueprint(
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=False,
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
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
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
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
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
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
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
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
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
            has_tool_registry=True,
            has_retry_policy=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
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
            has_tool_registry=True,
            has_retry_policy=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
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
        """stop_on=agent_says_done → FALSE_COMPLETION dominates."""
        bp = make_blueprint(
            has_tool_registry=True,
            has_retry_policy=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
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
            if trace.failure_reason == FailureReason.FALSE_COMPLETION:
                ungrounded += 1
        assert ungrounded > total * 0.5

    def test_evidence_pass_can_succeed(self):
        """stop_on=evidence_pass with reflexion can succeed."""
        bp = make_blueprint(
            has_tool_registry=True,
            has_retry_policy=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
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
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
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
            has_context_manager=True,
            has_tool_registry=True,
            has_state_persistence=True,
            has_sandbox_isolation=True,
            has_timeout_guard=True,
            has_permission_layer=True,
            has_retry_policy=True,
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
            harness=HarnessConfig(has_tool_registry=True, memory_capacity=5),
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
            has_context_manager=True,
            has_tool_registry=True,
            has_state_persistence=True,
            has_sandbox_isolation=True,
            has_permission_layer=True,
            has_retry_policy=True,
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
        """With a single attempt, feedback mode alone doesn't change the
        outcome: only the retry *slope* differs, so attempt 0 is identical.
        The reflexion case uses goal=schema_valid (no alignment bonus with
        test_runner evidence) so the first-attempt error matches blind."""
        engine = SimulationEngine()
        total = 200
        blind_ok = 0
        reflex_ok = 0
        blind_loop = LoopConfig(
            enabled=True, evidence="none", feedback="none",
            max_iterations=1, stop_on="evidence_pass",
        )
        reflex_loop = LoopConfig(
            enabled=True, evidence="test_runner", feedback="reflexion",
            goal="schema_valid", max_iterations=1, stop_on="evidence_pass",
        )
        for i in range(total):
            engine.rng = random.Random(30000 + i)
            ok_b, _, _ = engine._simulate_loop(blind_loop, 0.3)
            engine.rng = random.Random(30000 + i)
            ok_r, _, _ = engine._simulate_loop(reflex_loop, 0.3)
            if ok_b:
                blind_ok += 1
            if ok_r:
                reflex_ok += 1
        assert blind_ok == reflex_ok


def test_action_policy_edit_then_retest_beats_retry_same(level_5_blueprint):
    from app.models import LoopConfig
    base = level_5_blueprint.model_copy(deep=True)
    # Weaken the harness: with the full level-5 harness (hq=1.05) the loop
    # error is clamped to its 0.1 floor for every attempt, so every action
    # policy succeeds ~100% and nothing discriminates. max_iterations=1 keeps
    # the single-attempt error above the floor where the action bonus bites.
    base.harness = HarnessConfig(
        has_tool_registry=True,
        has_retry_policy=True,
        has_sandbox_isolation=True,
        has_state_persistence=True,
        memory_capacity=5,
    )
    base.loop = LoopConfig(enabled=True, evidence="test_runner",
                           feedback="reflexion", stop_on="evidence_pass",
                           max_iterations=1, action_policy="retry_same")
    retry_same_rate = sum(
        1 for _ in range(200)
        if SimulationEngine().simulate(base, seed=1000 + _).status == "SUCCESS"
    ) / 200
    base.loop.action_policy = "edit_then_retest"
    edit_rate = sum(
        1 for _ in range(200)
        if SimulationEngine().simulate(base, seed=1000 + _).status == "SUCCESS"
    ) / 200
    assert edit_rate > retry_same_rate


# ---------------------------------------------------------------------------
# Reflections
# ---------------------------------------------------------------------------


class TestReflections:
    def test_reflexion_produces_reflection_text(self):
        bp = make_blueprint(
            has_tool_registry=True,
            has_retry_policy=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
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
            has_tool_registry=True,
            has_retry_policy=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
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
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
            memory_capacity=5,
            loop_enabled=False,
            graph=chain_graph(),
        )
        feedback = make_blueprint(
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
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
            has_tool_registry=True,
            has_retry_policy=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
            memory_capacity=6,
            loop_enabled=True,
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=3,
            graph=chain_graph(),
        )
        parallel = make_blueprint(
            has_tool_registry=True,
            has_retry_policy=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
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
# Retry-policy gate
# ---------------------------------------------------------------------------


class TestRetryPolicyGate:
    def test_loop_without_retry_policy_traps(self):
        """Loop enabled but has_retry_policy=False → INFINITE_LOOP_TRAP."""
        bp = make_blueprint(
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
            memory_capacity=8,
            loop_enabled=True,
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=3,
        )
        engine = SimulationEngine()
        trace = engine.simulate(bp, seed=42)
        assert trace.failure_reason == FailureReason.INFINITE_LOOP_TRAP
        assert any(s.warning == WARNING_NO_RETRY_MECHANISM for s in trace.steps)
        assert any(s.action == "RETRY" for s in trace.steps)

    def test_with_retry_policy_loop_can_succeed(self):
        """Loop + has_retry_policy → high success rate."""
        bp = make_blueprint(
            has_tool_registry=True,
            has_retry_policy=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
            memory_capacity=8,
            loop_enabled=True,
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=3,
        )
        engine = SimulationEngine()
        result = engine.monte_carlo(bp, num_runs=100)
        assert result["success_rate"] >= 0.8


# ---------------------------------------------------------------------------
# action_policy / trigger (revived loop fields)
# ---------------------------------------------------------------------------


class TestEscalateReviewGate:
    """action_policy=escalate_review requires a reviewer node in the graph."""

    def _esc_bp(self, graph: GraphSpec | None = None) -> AgentBlueprint:
        bp = make_blueprint(
            has_tool_registry=True,
            has_retry_policy=True,
            has_sandbox_isolation=True,
            has_context_manager=True,
            has_state_persistence=True,
            has_permission_layer=True,
            memory_capacity=6,
            loop_enabled=True,
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=3,
            graph=graph,
        )
        bp.loop = LoopConfig(
            enabled=True,
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=3,
            action_policy="escalate_review",
        )
        return bp

    def test_escalate_review_requires_reviewer_gate(self):
        """Without a reviewer the loop short-circuits to INFINITE_LOOP_TRAP on
        every seed; adding a reviewer node lets the +0.05 action bonus win."""
        engine = SimulationEngine()

        # No reviewer: escalate_review short-circuits -> always traps.
        no_rev = self._esc_bp()  # default graph is a single coder, no reviewer
        for seed_offset in range(50):
            trace = engine.simulate(no_rev, seed=1000 + seed_offset)
            assert trace.status == "FAILED"
            assert trace.failure_reason == FailureReason.INFINITE_LOOP_TRAP

        # Same harness and loop, but a planner→coder→reviewer chain: can succeed.
        with_rev = self._esc_bp(graph=chain_graph())
        successes = sum(
            1
            for seed_offset in range(50)
            if engine.simulate(with_rev, seed=1000 + seed_offset).status == "SUCCESS"
        )
        assert successes >= 25


class TestTriggerTokenSurcharge:
    """trigger=on_task_start adds a CHECK_EVIDENCE overhead on the success path."""

    def test_on_task_start_costs_more_than_on_test_fail(self):
        """Over a success-heavy seeded batch, the on_task_start blueprint must
        spend strictly more tokens than the identical on_test_fail blueprint."""
        engine = SimulationEngine()
        totals = {"on_task_start": 0, "on_test_fail": 0}
        for trigger in ("on_task_start", "on_test_fail"):
            bp = make_blueprint(
                has_tool_registry=True,
                has_retry_policy=True,
                has_sandbox_isolation=True,
                has_context_manager=True,
                has_state_persistence=True,
                has_permission_layer=True,
                memory_capacity=8,
                loop_enabled=True,
                evidence="test_runner",
                feedback="reflexion",
                stop_on="evidence_pass",
                max_iterations=5,
            )
            bp.loop.trigger = trigger  # blueprints differ ONLY in trigger
            for seed_offset in range(200):
                totals[trigger] += engine.simulate(
                    bp, seed=20000 + seed_offset
                ).cost_tokens
        assert totals["on_task_start"] > totals["on_test_fail"]


# ---------------------------------------------------------------------------
# Budget guard
# ---------------------------------------------------------------------------


class TestBudgetGuard:
    def test_budget_exhausted_when_cap_low(self):
        bp = make_blueprint(
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_permission_layer=True,
            has_timeout_guard=True,
            run_boundary_cap=100,
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


# ---------------------------------------------------------------------------
# New injections: permission, unsafe execution, stale context
# ---------------------------------------------------------------------------


class TestPermissionGate:
    def test_permission_error_when_no_permission_layer(self):
        bp = make_blueprint(
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            memory_capacity=8,
            loop_enabled=False,
        )
        engine = SimulationEngine()
        count = 0
        for i in range(500):
            trace = engine.simulate(bp, seed=60000 + i)
            if trace.failure_reason == FailureReason.PERMISSION_ERROR:
                count += 1
        assert count > 0

    def test_permission_layer_prevents_permission_error(self):
        bp = make_blueprint(
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
            memory_capacity=8,
            loop_enabled=False,
        )
        engine = SimulationEngine()
        count = 0
        for i in range(500):
            trace = engine.simulate(bp, seed=61000 + i)
            if trace.failure_reason == FailureReason.PERMISSION_ERROR:
                count += 1
        assert count == 0


class TestUnsafeExecution:
    def test_unsafe_execution_without_sandbox(self):
        bp = make_blueprint(
            has_tool_registry=True,
            has_sandbox_isolation=False,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
            memory_capacity=8,
            loop_enabled=False,
        )
        engine = SimulationEngine()
        count = 0
        for i in range(500):
            trace = engine.simulate(bp, seed=62000 + i)
            if trace.failure_reason == FailureReason.UNSAFE_EXECUTION:
                count += 1
        assert count > 0

    def test_sandbox_prevents_unsafe_execution(self):
        bp = make_blueprint(
            has_tool_registry=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_context_manager=True,
            has_permission_layer=True,
            memory_capacity=8,
            loop_enabled=False,
        )
        engine = SimulationEngine()
        count = 0
        for i in range(500):
            trace = engine.simulate(bp, seed=63000 + i)
            if trace.failure_reason == FailureReason.UNSAFE_EXECUTION:
                count += 1
        assert count == 0


class TestStaleContext:
    def test_stale_risk_true_when_observed_lags_two(self):
        bp = make_blueprint()
        steps = [
            TraceStep(step=1, node="n2", action="THINK", status=StepStatus.SUCCESS, memory_used=0),
            TraceStep(step=2, node="n2", action="EDIT_FILE", status=StepStatus.SUCCESS, memory_used=1),
            TraceStep(step=3, node="n2", action="EDIT_FILE", status=StepStatus.SUCCESS, memory_used=2),
        ]
        assert SimulationEngine._stale_risk(bp, steps) is True

    def test_stale_risk_false_when_observed_fresh(self):
        bp = make_blueprint()
        steps = [
            TraceStep(step=1, node="n2", action="THINK", status=StepStatus.SUCCESS, memory_used=0),
            TraceStep(step=2, node="n2", action="EDIT_FILE", status=StepStatus.SUCCESS, memory_used=1),
            TraceStep(step=3, node="n2", action="CHECK_EVIDENCE", status=StepStatus.SUCCESS, memory_used=1),
        ]
        assert SimulationEngine._stale_risk(bp, steps) is False

    def test_stale_risk_false_when_lag_one(self):
        bp = make_blueprint()
        steps = [
            TraceStep(step=1, node="n2", action="THINK", status=StepStatus.SUCCESS, memory_used=0),
            TraceStep(step=2, node="n2", action="EDIT_FILE", status=StepStatus.SUCCESS, memory_used=1),
            TraceStep(step=3, node="n2", action="EDIT_FILE", status=StepStatus.SUCCESS, memory_used=2),
            TraceStep(step=4, node="n2", action="THINK", status=StepStatus.SUCCESS, memory_used=2),
        ]
        assert SimulationEngine._stale_risk(bp, steps) is False


class TestStaleContextReachability:
    def test_stale_context_reachable_in_simulation(self):
        """STALE_CONTEXT must fire in a real simulation, not just unit tests.

        A coder that performs a second EDIT_FILE (THINK -> EDIT#1 -> EDIT#2)
        acts on a snapshot 2 edits stale. High harness quality raises the
        second-edit probability; every other gate is suppressed so STALE is the
        only failure that can appear at that check point.
        """
        bp = make_blueprint(
            has_tool_registry=True,
            has_timeout_guard=True,
            has_sandbox_isolation=True,
            has_state_persistence=True,
            has_permission_layer=True,
            has_context_manager=False,  # the one missing dim -> stale observation
            memory_capacity=8,
            loop_enabled=False,
        )
        engine = SimulationEngine()
        count = 0
        for i in range(300):
            trace = engine.simulate(bp, seed=70000 + i)
            if trace.failure_reason == FailureReason.STALE_CONTEXT:
                count += 1
                assert any(
                    s.warning == WARNING_STALE_CONTEXT for s in trace.steps
                )
        assert count > 0


# ---------------------------------------------------------------------------
# Level + simulation engine integration (re-homed from test_levels.py)
# ---------------------------------------------------------------------------


def test_level_1_raw_has_low_success_rate(level_1_blueprint):
    """Level 1 with no harness should produce low success rate."""
    engine = SimulationEngine(seed=42)
    result = engine.monte_carlo(level_1_blueprint, num_runs=100)
    # Level 1 target is 8%, allow up to 25% due to randomness
    assert result["success_rate"] <= 0.25


def test_level_5_blueprint_has_high_success_rate(level_5_blueprint):
    """Full Agent + Graph blueprint should achieve high success rate."""
    engine = SimulationEngine(seed=42)
    result = engine.monte_carlo(level_5_blueprint, num_runs=100)
    # Level 5 target is 90%, allow down to 60% due to randomness
    assert result["success_rate"] >= 0.60
