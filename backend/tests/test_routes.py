"""Tests for the FastAPI HTTP routes."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# GET /api/levels
# ---------------------------------------------------------------------------


def test_get_levels_returns_all_4():
    """GET /api/levels should return 4 predefined levels."""
    response = client.get("/api/levels")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 4
    assert data[0]["id"] == "level_1_raw"


def test_get_level_1_by_id():
    """GET /api/levels/level_1_raw should return the Raw Model level."""
    response = client.get("/api/levels/level_1_raw")
    assert response.status_code == 200
    assert response.json()["name"] == "The Raw Model"


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
            "level_id": "level_4_graph",
            "harness": {
                "has_context_injection": True,
                "has_tool_surface": True,
                "has_persistence": True,
                "has_budget_guard": True,
                "has_sandbox_isolation": True,
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
