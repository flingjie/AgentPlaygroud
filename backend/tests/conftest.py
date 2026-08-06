"""Shared test fixtures for Agent Playground backend tests."""

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
def level_4_blueprint() -> AgentBlueprint:
    """Full level-4 AgentBlueprint: all harness, loop, graph."""
    return AgentBlueprint(
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
                GraphNode(id="n1", role="planner"),
                GraphNode(id="n2", role="coder"),
                GraphNode(id="n3", role="reviewer"),
            ],
            edges=[
                GraphEdge(source="n1", target="n2"),
                GraphEdge(source="n2", target="n3"),
            ],
            entry="n1",
        ),
    )
