"""Simulations router — simulation control and event queries."""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.project import Project
from app.models.simulation import Simulation, SimulationEvent
from app.schemas.simulation import (
    SimulationCreate, SimulationResponse, EventResponse,
    EventListResponse, EventFilters, ContinuousRunConfig,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/projects/{project_id}/simulations", response_model=SimulationResponse, status_code=201)
async def create_simulation(
    project_id: uuid.UUID,
    data: SimulationCreate,
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project or project.deleted_at:
        raise HTTPException(404, "Project not found")
    sim = Simulation(project_id=project_id, **data.model_dump())
    db.add(sim)
    await db.flush()
    await db.refresh(sim)
    return sim


@router.get("/projects/{project_id}/simulations", response_model=list[SimulationResponse])
async def list_simulations(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    q = select(Simulation).where(Simulation.project_id == project_id).order_by(Simulation.created_at.desc())
    return (await db.execute(q)).scalars().all()


@router.get("/simulations/{simulation_id}", response_model=SimulationResponse)
async def get_simulation(simulation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    sim = await db.get(Simulation, simulation_id)
    if not sim:
        raise HTTPException(404, "Simulation not found")
    return sim


@router.post("/simulations/{simulation_id}/run-tick")
async def run_tick(simulation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Run a single simulation tick synchronously."""
    sim = await db.get(Simulation, simulation_id)
    if not sim:
        raise HTTPException(404, "Simulation not found")
    if sim.status not in ("draft", "running", "paused"):
        raise HTTPException(409, f"Cannot run tick: simulation status is '{sim.status}'")

    # Set to running if draft
    if sim.status == "draft":
        sim.status = "running"
        await db.flush()

    try:
        from app.services.simulation_engine import SimulationEngine
        engine = SimulationEngine(db)
        result = await engine.run_tick(simulation_id)
        await db.flush()
        return {
            "tick": result.tick,
            "events": result.events,
            "warnings": result.warnings,
            "errors": result.errors,
        }
    except Exception as e:
        logger.error(f"Tick failed for simulation {simulation_id}: {e}")
        # Don't change sim status on tick failure — keep it running
        return {
            "tick": None,
            "events": [],
            "warnings": [],
            "errors": [str(e)],
        }


@router.post("/simulations/{simulation_id}/run", status_code=202)
async def run_continuous(
    simulation_id: uuid.UUID,
    config: ContinuousRunConfig,
    db: AsyncSession = Depends(get_db),
):
    """Run multiple ticks continuously."""
    sim = await db.get(Simulation, simulation_id)
    if not sim:
        raise HTTPException(404, "Simulation not found")
    # TODO: Wire to SimulationEngine.run_continuous via Celery
    return {"task_id": str(uuid.uuid4()), "status": "pending", "tick_count": config.tick_count}


@router.post("/simulations/{simulation_id}/pause")
async def pause_simulation(simulation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    sim = await db.get(Simulation, simulation_id)
    if not sim:
        raise HTTPException(404, "Simulation not found")
    if sim.status != "running":
        raise HTTPException(409, f"Cannot pause: status is '{sim.status}'")
    sim.status = "paused"
    await db.flush()
    return {"status": "paused", "current_tick": sim.current_tick}


@router.post("/simulations/{simulation_id}/resume")
async def resume_simulation(simulation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    sim = await db.get(Simulation, simulation_id)
    if not sim:
        raise HTTPException(404, "Simulation not found")
    if sim.status != "paused":
        raise HTTPException(409, f"Cannot resume: status is '{sim.status}'")
    sim.status = "running"
    await db.flush()
    return {"status": "running", "current_tick": sim.current_tick}


@router.post("/simulations/{simulation_id}/branch", response_model=SimulationResponse, status_code=201)
async def branch_simulation(
    simulation_id: uuid.UUID,
    name: str | None = None,
    branch_from_tick: int | None = None,
    branch_reason: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    parent = await db.get(Simulation, simulation_id)
    if not parent:
        raise HTTPException(404, "Simulation not found")
    tick = branch_from_tick or parent.current_tick
    branch = Simulation(
        project_id=parent.project_id,
        name=name or f"Branch from tick {tick}",
        status="draft",
        current_tick=tick,
        parent_simulation_id=parent.id,
        branch_reason=branch_reason,
        config=parent.config,
    )
    db.add(branch)
    await db.flush()
    await db.refresh(branch)
    return branch


@router.get("/simulations/{simulation_id}/events", response_model=EventListResponse)
async def list_events(
    simulation_id: uuid.UUID,
    tick: int | None = None,
    event_type: str | None = None,
    participant_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    base_q = select(SimulationEvent).where(SimulationEvent.simulation_id == simulation_id)
    if tick is not None:
        base_q = base_q.where(SimulationEvent.tick == tick)
    if event_type:
        base_q = base_q.where(SimulationEvent.event_type == event_type)

    # Count total
    from sqlalchemy import func
    count_q = select(func.count()).select_from(base_q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Fetch page
    q = base_q.order_by(SimulationEvent.tick.desc(), SimulationEvent.created_at.desc())
    q = q.offset((page - 1) * page_size).limit(page_size)
    events = (await db.execute(q)).scalars().all()
    return EventListResponse(total=total, events=events)


@router.get("/simulations/{simulation_id}/timeline")
async def get_timeline(simulation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get full timeline grouped by tick."""
    q = (
        select(SimulationEvent)
        .where(SimulationEvent.simulation_id == simulation_id)
        .order_by(SimulationEvent.tick, SimulationEvent.created_at)
    )
    events = (await db.execute(q)).scalars().all()

    # Group by tick
    ticks: dict[int, list] = {}
    for e in events:
        tick_data = ticks.setdefault(e.tick, [])
        tick_data.append(EventResponse.model_validate(e).model_dump())

    return {"ticks": [{"tick": t, "events": evts} for t, evts in sorted(ticks.items())]}


@router.get("/simulations/{simulation_id}/graph")
async def get_graph(simulation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get causal graph data (nodes + edges)."""
    q = select(SimulationEvent).where(SimulationEvent.simulation_id == simulation_id)
    events = (await db.execute(q)).scalars().all()

    nodes = []
    edges = []
    for e in events:
        nodes.append({"id": str(e.id), "type": "event", "label": e.title, "tick": e.tick})
        for pid in (e.participants or []):
            edges.append({"source": str(pid), "target": str(e.id), "type": "participant"})
        for cause_id in (e.causes or []):
            edges.append({"source": str(cause_id), "target": str(e.id), "type": "causes"})

    return {"nodes": nodes, "edges": edges}
