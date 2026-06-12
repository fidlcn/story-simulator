"""Characters router — character CRUD and generation."""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.project import Project
from app.models.character import Character, Relationship
from app.schemas.character import (
    CharacterCreate, CharacterUpdate, CharacterResponse,
    CharacterGenerateRequest, RelationshipCreate, RelationshipResponse,
)

router = APIRouter()


@router.get("/projects/{project_id}/characters", response_model=list[CharacterResponse])
async def list_characters(
    project_id: uuid.UUID,
    role_type: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project or project.deleted_at:
        raise HTTPException(404, "Project not found")
    q = select(Character).where(Character.project_id == project_id, Character.active == True)
    if role_type:
        q = q.where(Character.role_type == role_type)
    q = q.order_by(Character.created_at)
    return (await db.execute(q)).scalars().all()


@router.post("/projects/{project_id}/characters", response_model=CharacterResponse, status_code=201)
async def create_character(
    project_id: uuid.UUID,
    data: CharacterCreate,
    db: AsyncSession = Depends(get_db),
):
    project = await db.get(Project, project_id)
    if not project or project.deleted_at:
        raise HTTPException(404, "Project not found")
    character = Character(project_id=project_id, **data.model_dump())
    db.add(character)
    await db.flush()
    await db.refresh(character)
    return character


@router.post("/projects/{project_id}/characters/generate", status_code=202)
async def generate_characters(
    project_id: uuid.UUID,
    data: CharacterGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """AI-generate characters. Returns task_id."""
    project = await db.get(Project, project_id)
    if not project or project.deleted_at:
        raise HTTPException(404, "Project not found")
    # TODO: Wire to Celery worker + SeedGenerationAgent
    return {"task_id": str(uuid.uuid4()), "status": "pending", "message": "Character generation queued (not yet implemented)"}


@router.get("/characters/{character_id}", response_model=CharacterResponse)
async def get_character(character_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    character = await db.get(Character, character_id)
    if not character:
        raise HTTPException(404, "Character not found")
    return character


@router.patch("/characters/{character_id}", response_model=CharacterResponse)
async def update_character(
    character_id: uuid.UUID,
    data: CharacterUpdate,
    db: AsyncSession = Depends(get_db),
):
    character = await db.get(Character, character_id)
    if not character:
        raise HTTPException(404, "Character not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(character, k, v)
    await db.flush()
    await db.refresh(character)
    return character


# --- Relationships ---

@router.get("/projects/{project_id}/relationships", response_model=list[RelationshipResponse])
async def list_relationships(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    q = select(Relationship).where(Relationship.project_id == project_id)
    return (await db.execute(q)).scalars().all()


@router.post("/projects/{project_id}/relationships", response_model=RelationshipResponse, status_code=201)
async def create_relationship(
    project_id: uuid.UUID,
    data: RelationshipCreate,
    db: AsyncSession = Depends(get_db),
):
    rel = Relationship(project_id=project_id, **data.model_dump())
    db.add(rel)
    await db.flush()
    await db.refresh(rel)
    return rel
