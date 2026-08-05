# Agent Playground MVP — Backend

Deterministic simulation backend for the Agent Playground game. Built with FastAPI and Pydantic v2.

## Quick Start

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The server starts at http://localhost:8000. Interactive docs at http://localhost:8000/docs.

## Running Tests

```bash
cd backend
pytest tests/ -v
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/levels` | List all 4 level configurations |
| `GET` | `/api/levels/{id}` | Get a single level by ID |
| `POST` | `/api/simulate` | Run a single deterministic simulation |
| `POST` | `/api/monte-carlo` | Run N simulations with aggregate stats |
| `WS` | `/ws/simulate/{run_id}` | Stream a simulation trace step-by-step |

## Project Layout

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI app, CORS, root router
│   ├── models.py        # Pydantic v2 models (AgentBlueprint, RunTrace, LevelInfo, …)
│   ├── engine.py        # Deterministic simulation engine + Monte Carlo runner
│   ├── routes.py        # HTTP + WebSocket endpoints
│   └── levels.py        # 4 predefined level configurations
├── tests/
│   ├── conftest.py      # Shared pytest fixtures
│   ├── test_models.py   # Model serialisation/deserialisation tests
│   ├── test_engine.py   # Engine failure injection, determinism, Monte Carlo tests
│   └── test_levels.py   # Level definition validation tests
└── requirements.txt
```

## Key Design Decisions

- **All simulation is deterministic.** Uses `random.Random(seed)` — zero LLM/API calls.
- **Failure injection** is driven by the AgentBlueprint's harness, loop, and graph configuration.
- **Harness quality** is a derived score affecting success probability.
- **Graph bonus** (Level 4) gives each sub-agent isolated memory and high per-node base success.
- **Monte Carlo runs** use sequential seeds from `base_seed + i` for full reproducibility.
