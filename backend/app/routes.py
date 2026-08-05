from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.engine import SimulationEngine
from app.levels import ALL_LEVELS, LEVELS_BY_ID
from app.models import (
    AgentBlueprint,
    LevelInfo,
    MonteCarloRequest,
    MonteCarloResponse,
    RunTrace,
)

router = APIRouter()

# Single engine instance (stateless aside from RNG which is re-seeded per run)
engine = SimulationEngine()


# ---------------------------------------------------------------------------
# Level info
# ---------------------------------------------------------------------------


@router.get("/api/levels", response_model=list[LevelInfo])
async def get_levels():
    """Return all predefined level configurations."""
    return ALL_LEVELS


@router.get("/api/levels/{level_id}", response_model=LevelInfo)
async def get_level(level_id: str):
    """Return a single level by its ID."""
    level = LEVELS_BY_ID.get(level_id)
    if level is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Level '{level_id}' not found")
    return level


# ---------------------------------------------------------------------------
# Single-run simulation
# ---------------------------------------------------------------------------


@router.post("/api/simulate", response_model=RunTrace)
async def simulate(blueprint: AgentBlueprint):
    """Run a single deterministic simulation and return the full RunTrace."""
    return engine.simulate(blueprint)


# ---------------------------------------------------------------------------
# Monte Carlo simulation
# ---------------------------------------------------------------------------


@router.post("/api/monte-carlo", response_model=MonteCarloResponse)
async def monte_carlo(req: MonteCarloRequest):
    """Run N simulations and return aggregate statistics."""
    result = engine.monte_carlo(req.blueprint, req.num_runs)
    return MonteCarloResponse(**result)


# ---------------------------------------------------------------------------
# WebSocket streaming simulation
# ---------------------------------------------------------------------------


@router.websocket("/ws/simulate/{run_id}")
async def ws_simulate(websocket: WebSocket, run_id: str):
    """Stream a simulation trace step-by-step over a WebSocket.

    The client sends an AgentBlueprint JSON message to start, and the server
    streams each TraceStep as it is generated, finishing with a final
    ``{"type": "complete", "trace": ...}`` message.
    """
    await websocket.accept()

    try:
        # Wait for the blueprint from the client
        raw = await websocket.receive_text()
        blueprint = AgentBlueprint.model_validate_json(raw)

        gen = engine.simulate_stream(blueprint)

        # We have to bridge the sync generator into the async event loop
        loop = asyncio.get_running_loop()

        while True:
            try:
                step_or_trace = await loop.run_in_executor(None, next, gen)
            except StopIteration as exc:
                trace: RunTrace = exc.value
                await websocket.send_json({
                    "type": "complete",
                    "trace": trace.model_dump(),
                })
                break

            # It is a TraceStep dict
            await websocket.send_json({
                "type": "step",
                "step": step_or_trace,
            })

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        await websocket.send_json({"type": "error", "message": str(exc)})
