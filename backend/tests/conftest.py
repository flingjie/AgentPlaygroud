"""Shared test fixtures for Agent Engineering Simulator backend tests."""

import pytest

from app.models import (
    AgentBlueprint,
    GraphEdge,
    GraphNode,
    GraphSpec,
    HarnessConfig,
    LoopConfig,
)


@pytest.fixture
def level_1_blueprint() -> AgentBlueprint:
    """Minimal level-1 AgentBlueprint: no harness, no loop, no graph."""
    return AgentBlueprint(
        level_id="level_1_raw",
        run_seed=42,
        harness=HarnessConfig(memory_capacity=3),
        loop=LoopConfig(enabled=False),
        graph=GraphSpec(nodes=[GraphNode(id="node_1", role="coder")]),
    )


@pytest.fixture
def level_5_blueprint() -> AgentBlueprint:
    """Full Agent + Graph blueprint: 7-dim harness, loop, graph."""
    return AgentBlueprint(
        level_id="level_5_graph",
        run_seed=42,
        harness=HarnessConfig(
            has_tool_registry=True,
            has_retry_policy=True,
            has_timeout_guard=True,
            run_boundary_cap=100_000,
            has_sandbox_isolation=True,
            has_context_manager=True,
            has_state_persistence=True,
            has_permission_layer=True,
            memory_capacity=9,
        ),
        loop=LoopConfig(
            enabled=True,
            trigger="on_task_start",
            goal="tests_green",
            state_policy="keep_last_error",
            action_policy="edit_then_retest",
            evidence="test_runner",
            feedback="reflexion",
            stop_on="evidence_pass",
            max_iterations=5,
        ),
        graph=GraphSpec(
            nodes=[
                GraphNode(id="n1", role="planner"),
                GraphNode(id="n2", role="coder"),
                GraphNode(id="n3", role="reviewer"),
                GraphNode(id="n4", role="tester"),
            ],
            edges=[
                GraphEdge(source="n1", target="n2"),
                GraphEdge(source="n2", target="n3"),
                GraphEdge(source="n3", target="n4"),
            ],
            entry="n1",
        ),
    )
