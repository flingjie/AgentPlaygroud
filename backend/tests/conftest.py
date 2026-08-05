"""Shared test fixtures for Agent Forge backend tests."""

import pytest

from app.models import AgentBlueprint, GraphNode, HarnessConfig, LoopStrategy


@pytest.fixture
def level_1_blueprint() -> AgentBlueprint:
    """Minimal level-1 AgentBlueprint: no harness, no loop, no graph."""
    return AgentBlueprint(
        level_id="level_1_raw",
        run_seed=42,
        harness=HarnessConfig(
            has_workspace=False,
            has_sandbox=False,
            has_git=False,
            memory_capacity=3,
        ),
        loop_strategy=LoopStrategy(type="none", max_retries=1, stop_condition="none"),
        graph_nodes=[GraphNode(id="node_1", role="coder", next=[])],
    )


@pytest.fixture
def level_4_blueprint() -> AgentBlueprint:
    """Full level-4 AgentBlueprint: all harness, loop, graph."""
    return AgentBlueprint(
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
