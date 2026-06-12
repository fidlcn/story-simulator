"""Worlds router — world settings and facts."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.project import Project
from app.models.world import World, WorldFact
from app.schemas.world import (
    WorldUpdate, WorldResponse, WorldFactCreate, WorldFactResponse, WorldGenerateRequest,
)

router = APIRouter()


async def _get_project_world(project_id: uuid.UUID, db: AsyncSession) -> World:
    project = await db.get(Project, project_id)
    if not project or project.deleted_at:
        raise HTTPException(404, "Project not found")
    q = select(World).where(World.project_id == project_id)
    world = (await db.execute(q)).scalar_one_or_none()
    if not world:
        world = World(project_id=project_id)
        db.add(world)
        await db.flush()
        await db.refresh(world)
    return world


def _build_world_response(world: World, facts: list[WorldFact]) -> WorldResponse:
    """Build WorldResponse from ORM objects, avoiding lazy-load issues."""
    return WorldResponse(
        id=world.id,
        project_id=world.project_id,
        premise=world.premise,
        era=world.era,
        geography=world.geography,
        political_structure=world.political_structure,
        economy=world.economy,
        technology_level=world.technology_level,
        magic_or_power_system=world.magic_or_power_system,
        social_rules=world.social_rules or [],
        cultural_norms=world.cultural_norms or [],
        current_instability=world.current_instability,
        facts=[WorldFactResponse(
            id=f.id, text=f.text, scope=f.scope, status=f.status,
            introduced_at_tick=f.introduced_at_tick, source=f.source,
            constraints=f.constraints or [], created_at=f.created_at, updated_at=f.updated_at,
        ) for f in facts],
        created_at=world.created_at,
        updated_at=world.updated_at,
    )


@router.get("/projects/{project_id}/world", response_model=WorldResponse)
async def get_world(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    world = await _get_project_world(project_id, db)
    facts_q = select(WorldFact).where(WorldFact.world_id == world.id)
    world_facts = (await db.execute(facts_q)).scalars().all()
    return _build_world_response(world, world_facts)


@router.patch("/projects/{project_id}/world", response_model=WorldResponse)
async def update_world(
    project_id: uuid.UUID,
    data: WorldUpdate,
    db: AsyncSession = Depends(get_db),
):
    world = await _get_project_world(project_id, db)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(world, k, v)
    await db.flush()
    await db.refresh(world)
    facts_q = select(WorldFact).where(WorldFact.world_id == world.id)
    world_facts = (await db.execute(facts_q)).scalars().all()
    return _build_world_response(world, world_facts)


@router.post("/projects/{project_id}/world/generate", status_code=202)
async def generate_world(
    project_id: uuid.UUID,
    data: WorldGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """AI-generate world settings. Returns task_id for polling."""
    # TODO: Wire to Celery worker + SeedGenerationAgent
    return {"task_id": str(uuid.uuid4()), "status": "pending", "message": "World generation queued (not yet implemented)"}


@router.post(
    "/projects/{project_id}/world/facts",
    response_model=WorldFactResponse,
    status_code=201,
)
async def create_fact(
    project_id: uuid.UUID,
    data: WorldFactCreate,
    db: AsyncSession = Depends(get_db),
):
    world = await _get_project_world(project_id, db)
    fact = WorldFact(world_id=world.id, **data.model_dump())
    db.add(fact)
    await db.flush()
    await db.refresh(fact)
    return fact


@router.post(
    "/projects/{project_id}/world/facts/{fact_id}/lock",
    response_model=WorldFactResponse,
)
async def lock_fact(
    project_id: uuid.UUID,
    fact_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    fact = await db.get(WorldFact, fact_id)
    if not fact or fact.world_id != (await _get_project_world(project_id, db)).id:
        raise HTTPException(404, "Fact not found")
    if fact.status == "locked":
        raise HTTPException(409, "Fact already locked")
    fact.status = "locked"
    await db.flush()
    await db.refresh(fact)
    return fact
