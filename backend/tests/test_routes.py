"""Tests for the FastAPI HTTP routes."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# GET /api/levels
# ---------------------------------------------------------------------------


def test_get_levels_returns_all_6():
    """GET /api/levels should return 6 predefined levels."""
    response = client.get("/api/levels")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    assert data[0]["id"] == "level_1_raw"
    assert data[-1]["id"] == "level_6_agent_system"


def test_get_level_1_by_id():
    """GET /api/levels/level_1_raw should return the Raw Model level."""
    response = client.get("/api/levels/level_1_raw")
    assert response.status_code == 200
    assert response.json()["name"] == "Agent"
    assert response.json()["learning_label"] == "Raw LLM"


def test_get_level_404():
    """GET /api/levels/nonexistent should return 404."""
    response = client.get("/api/levels/nonexistent")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/simulate
# ---------------------------------------------------------------------------


def test_simulate_endpoint():
    """POST /api/simulate should return a valid RunTrace."""
    blueprint = {
        "level_id": "level_1_raw",
        "harness": {},
        "loop": {},
        "graph": {"nodes": [], "edges": []},
    }
    response = client.post("/api/simulate", json=blueprint)
    assert response.status_code == 200
    trace = response.json()
    assert "run_id" in trace
    assert "status" in trace
    assert "steps" in trace
    assert "failure_reason" in trace


# ---------------------------------------------------------------------------
# POST /api/monte-carlo
# ---------------------------------------------------------------------------


def test_monte_carlo_endpoint():
    """POST /api/monte-carlo should return aggregate stats."""
    req = {
        "blueprint": {
            "level_id": "level_5_graph",
            "harness": {
                "has_tool_registry": True,
                "has_retry_policy": True,
                "has_timeout_guard": True,
                "has_sandbox_isolation": True,
                "has_context_manager": True,
                "has_state_persistence": True,
                "has_permission_layer": True,
                "memory_capacity": 8,
            },
            "loop": {
                "enabled": True,
                "evidence": "test_runner",
                "feedback": "reflexion",
                "max_iterations": 5,
                "stop_on": "evidence_pass",
            },
            "graph": {
                "nodes": [
                    {"id": "p1", "role": "planner"},
                    {"id": "c1", "role": "coder"},
                    {"id": "r1", "role": "reviewer"},
                ],
                "edges": [
                    {"source": "p1", "target": "c1"},
                    {"source": "c1", "target": "r1"},
                ],
            },
        },
        "num_runs": 20,
    }
    response = client.post("/api/monte-carlo", json=req)
    assert response.status_code == 200
    data = response.json()
    assert "success_rate" in data
    assert "avg_tokens" in data
    assert "failure_distribution" in data
    assert "sample_traces" in data
    assert 0 <= data["success_rate"] <= 1


def test_monte_carlo_invalid_num_runs():
    """POST /api/monte-carlo with num_runs=0 should fail validation."""
    req = {
        "blueprint": {
            "level_id": "level_1_raw",
            "harness": {},
            "loop": {},
            "graph": {"nodes": [], "edges": []},
        },
        "num_runs": 0,
    }
    response = client.post("/api/monte-carlo", json=req)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------


def test_health_check():
    """GET /health should return ok."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /api/export
# ---------------------------------------------------------------------------


def test_export_endpoint_returns_langgraph_and_arlo():
    from app.models import AgentBlueprint

    bp = AgentBlueprint(level_id="level_6_agent_system")
    res = client.post("/api/export", json=bp.model_dump())
    assert res.status_code == 200
    data = res.json()
    assert "langgraph" in data and "arlo_yaml" in data
    assert "StateGraph" in data["langgraph"]
    assert "agent:" in data["arlo_yaml"]


def test_export_checkpointing_emits_memorysaver_import():
    """A checkpointed graph must import MemorySaver before compile() uses it."""
    from app.models import AgentBlueprint

    bp = AgentBlueprint(
        level_id="level_6_agent_system",
        graph={
            "state_schema": ["messages", "task"],
            "nodes": [
                {"id": "n1", "role": "planner"},
                {"id": "n2", "role": "coder"},
            ],
            "edges": [{"source": "n1", "target": "n2"}],
            "entry": "n1",
            "checkpointing": True,
        },
    )
    res = client.post("/api/export", json=bp.model_dump())
    assert res.status_code == 200
    langgraph = res.json()["langgraph"]
    assert "MemorySaver" in langgraph
    assert "from langgraph.checkpoint.memory import MemorySaver" in langgraph
    # the import must come before the compile() that references MemorySaver
    assert (
        langgraph.index("from langgraph.checkpoint.memory import MemorySaver")
        < langgraph.index("checkpointer=MemorySaver()")
    )


def test_export_non_checkpointing_omits_memorysaver_import():
    """A non-checkpointed graph must NOT import MemorySaver (clean output)."""
    from app.models import AgentBlueprint

    bp = AgentBlueprint(level_id="level_6_agent_system")
    res = client.post("/api/export", json=bp.model_dump())
    assert res.status_code == 200
    assert "MemorySaver" not in res.json()["langgraph"]


def test_export_arlo_has_harness_permission_layer():
    """arlo export reflects the 7-dim harness keys, incl. has_permission_layer."""
    from app.models import AgentBlueprint

    bp = AgentBlueprint(
        level_id="level_6_agent_system",
        harness={
            "has_tool_registry": True,
            "has_retry_policy": True,
            "has_timeout_guard": True,
            "has_sandbox_isolation": True,
            "has_context_manager": True,
            "has_state_persistence": True,
            "has_permission_layer": True,
            "memory_capacity": 8,
        },
        graph={"state_schema": ["messages", "task"]},
    )
    res = client.post("/api/export", json=bp.model_dump())
    assert res.status_code == 200
    arlo = res.json()["arlo_yaml"]
    assert "permission_layer: true" in arlo
    assert "state_schema: ['messages', 'task']" in arlo
