"""Narratives router — multiple narrative lenses per simulation."""
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.simulation import Simulation, SimulationEvent
from app.models.narrative import NarrativeLens, NarrativeBeat, Scene
from app.models.character import Character
from app.schemas.narrative import (
    NarrativeLensCreate, NarrativeLensResponse,
    NarrativeBeatResponse, SceneResponse, BeatsGenerateRequest,
)
from app.agents.orchestrator import AgentOrchestrator
from app.agents.llm_client import LLMClient
from app.agents.base_agent import AgentOutputError

logger = logging.getLogger(__name__)

router = APIRouter()


def _is_valid_uuid(value) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


# ── Lens CRUD (per simulation) ──

@router.get("/simulations/{simulation_id}/narrative-lenses", response_model=list[NarrativeLensResponse])
async def list_narrative_lenses(simulation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """List all narrative lenses for a simulation."""
    return (await db.execute(
        select(NarrativeLens)
        .where(NarrativeLens.simulation_id == simulation_id)
        .order_by(NarrativeLens.created_at)
    )).scalars().all()


@router.post("/simulations/{simulation_id}/narrative-lenses", response_model=NarrativeLensResponse, status_code=201)
async def create_narrative_lens(
    simulation_id: uuid.UUID,
    data: NarrativeLensCreate,
    db: AsyncSession = Depends(get_db),
):
    sim = await db.get(Simulation, simulation_id)
    if not sim:
        raise HTTPException(404, "Simulation not found")
    lens = NarrativeLens(
        simulation_id=simulation_id,
        protagonist_ids=[str(pid) for pid in data.protagonist_ids],
        **data.model_dump(exclude={"protagonist_ids"}),
    )
    db.add(lens)
    await db.flush()
    await db.refresh(lens)
    return lens


# ── Single lens operations ──

async def _get_lens(lens_id: uuid.UUID, db: AsyncSession) -> NarrativeLens:
    lens = await db.get(NarrativeLens, lens_id)
    if not lens:
        raise HTTPException(404, "Narrative lens not found")
    return lens


@router.get("/narrative-lens/{lens_id}", response_model=NarrativeLensResponse)
async def get_narrative_lens(lens_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await _get_lens(lens_id, db)


@router.delete("/narrative-lens/{lens_id}", status_code=204)
async def delete_narrative_lens(lens_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    lens = await _get_lens(lens_id, db)
    await db.delete(lens)
    await db.flush()


# ── Beats (per lens) ──

@router.post("/narrative-lens/{lens_id}/beats/generate", response_model=list[NarrativeBeatResponse])
async def generate_beats(
    lens_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    body: BeatsGenerateRequest | None = None,
):
    """AI-generate narrative beats for a specific lens."""
    lens = await _get_lens(lens_id, db)
    simulation_id = lens.simulation_id

    # Load events — filter by focus_event_ids if provided
    q = (
        select(SimulationEvent)
        .where(SimulationEvent.simulation_id == simulation_id)
        .order_by(SimulationEvent.tick, SimulationEvent.created_at)
    )
    focus_ids = body.focus_event_ids if body else None
    if focus_ids:
        q = q.where(SimulationEvent.id.in_(focus_ids))
    events = (await db.execute(q)).scalars().all()
    if not events:
        raise HTTPException(400, "No events found — run simulation ticks first")

    # Load protagonist characters
    protagonist_uuids = [uuid.UUID(pid) for pid in lens.protagonist_ids]
    chars = (await db.execute(
        select(Character).where(Character.id.in_(protagonist_uuids))
    )).scalars().all()

    # Build agent context
    objective_timeline = [
        {
            "event_id": str(e.id), "tick": e.tick, "title": e.title,
            "summary": e.summary, "event_type": e.event_type,
            "participants": e.participants, "emotional_impact": e.emotional_impact,
        }
        for e in events
    ]
    character_arcs = [
        {
            "character_id": str(c.id), "name": c.name, "desire": c.desire,
            "fear": c.fear, "misbelief": c.misbelief,
            "public_goal": c.public_goal, "hidden_goal": c.hidden_goal,
        }
        for c in chars
    ]
    context = {
        "objective_timeline": objective_timeline,
        "lens": {
            "structure": lens.structure, "protagonist_ids": lens.protagonist_ids,
            "central_question": lens.central_question, "emotional_spine": lens.emotional_spine,
            "excluded_event_policy": lens.excluded_event_policy,
            "preferred_narrative_structure": lens.preferred_narrative_structure,
        },
        "character_arcs": character_arcs,
    }

    try:
        llm = LLMClient()
        llm.max_tokens = 8192
        orchestrator = AgentOrchestrator(llm)
        result = await orchestrator.narrative_agent.run(context, simulation_id=simulation_id)
    except AgentOutputError as e:
        raise HTTPException(502, f"AI 生成节拍失败：{e.detail}")
    except Exception as e:
        raise HTTPException(500, f"生成节拍时出错：{str(e)}")

    # Delete existing beats for this lens
    existing = (await db.execute(
        select(NarrativeBeat).where(NarrativeBeat.lens_id == lens_id)
    )).scalars().all()
    for b in existing:
        await db.delete(b)
    await db.flush()

    # Write new beats
    created = []
    for bd in result.get("beats", []):
        valid_eids = [eid for eid in bd.get("related_event_ids", []) if _is_valid_uuid(eid)]
        protag_id = bd.get("protagonist_id", "")
        if not _is_valid_uuid(protag_id):
            protag_id = lens.protagonist_ids[0] if lens.protagonist_ids else None
        if not protag_id:
            continue
        beat = NarrativeBeat(
            simulation_id=simulation_id, lens_id=lens_id,
            beat_order=bd["beat_order"], beat_type=bd["beat_type"],
            related_event_ids=valid_eids, protagonist_id=uuid.UUID(str(protag_id)),
            dramatic_purpose=bd.get("dramatic_purpose"), summary=bd.get("summary"),
            emotional_turn=bd.get("emotional_turn"),
        )
        db.add(beat)
        created.append(beat)

    await db.flush()
    for b in created:
        await db.refresh(b)
    return created


@router.get("/narrative-lens/{lens_id}/beats", response_model=list[NarrativeBeatResponse])
async def list_beats(lens_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return (await db.execute(
        select(NarrativeBeat).where(NarrativeBeat.lens_id == lens_id).order_by(NarrativeBeat.beat_order)
    )).scalars().all()


# ── Scenes (per lens) ──

@router.post("/narrative-lens/{lens_id}/scenes/generate", response_model=list[SceneResponse])
async def generate_scenes(lens_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """AI-generate scenes for a specific lens's beats."""
    await _get_lens(lens_id, db)
    beats = (await db.execute(
        select(NarrativeBeat).where(NarrativeBeat.lens_id == lens_id).order_by(NarrativeBeat.beat_order)
    )).scalars().all()
    if not beats:
        raise HTTPException(400, "No beats found — generate beats first")

    # Load related events
    all_event_ids = set()
    for b in beats:
        for eid in (b.related_event_ids or []):
            if _is_valid_uuid(eid):
                all_event_ids.add(str(eid))
    events_map = {}
    if all_event_ids:
        evts = (await db.execute(
            select(SimulationEvent).where(SimulationEvent.id.in_([uuid.UUID(eid) for eid in all_event_ids]))
        )).scalars().all()
        events_map = {str(e.id): e for e in evts}

    # Load characters
    char_ids = set()
    for e in events_map.values():
        for pid in (e.participants or []):
            if _is_valid_uuid(pid):
                char_ids.add(str(pid))
    for b in beats:
        char_ids.add(str(b.protagonist_id))
    chars_map = {}
    if char_ids:
        cs = (await db.execute(
            select(Character).where(Character.id.in_([uuid.UUID(cid) for cid in char_ids]))
        )).scalars().all()
        chars_map = {str(c.id): {"name": c.name, "role_type": c.role_type} for c in cs}

    beats_context = []
    for b in beats:
        related = []
        for eid in (b.related_event_ids or []):
            ev = events_map.get(eid)
            if ev:
                related.append({"event_id": eid, "title": ev.title, "summary": ev.summary})
        beats_context.append({
            "beat_id": str(b.id), "beat_order": b.beat_order, "beat_type": b.beat_type,
            "summary": b.summary, "dramatic_purpose": b.dramatic_purpose,
            "emotional_turn": b.emotional_turn, "protagonist_id": str(b.protagonist_id),
            "related_events": related,
        })
    context = {"beats": beats_context, "characters": chars_map}

    try:
        llm = LLMClient()
        llm.max_tokens = 16384
        orchestrator = AgentOrchestrator(llm)
        result = await orchestrator.screenplay_agent.run(context, simulation_id=beats[0].simulation_id)
    except AgentOutputError as e:
        raise HTTPException(502, f"AI 生成场景失败：{e.detail}")
    except Exception as e:
        raise HTTPException(500, f"生成场景时出错：{str(e)}")

    # Delete existing scenes
    existing = (await db.execute(
        select(Scene).join(NarrativeBeat).where(NarrativeBeat.lens_id == lens_id)
    )).scalars().all()
    for s in existing:
        await db.delete(s)
    await db.flush()

    created = []
    for sd in result.get("scenes", []):
        beat = next((b for b in beats if str(b.id) == sd.get("beat_id")), None)
        if not beat:
            continue
        scene = Scene(
            beat_id=beat.id, scene_order=sd["scene_order"],
            heading=sd.get("heading"), location=sd.get("location"),
            time_of_day=sd.get("time_of_day"), characters=sd.get("characters", []),
            scene_goal=sd.get("scene_goal"), conflict=sd.get("conflict"),
            turn=sd.get("turn"), action=sd.get("action"),
            dialogue=[d.model_dump() if hasattr(d, "model_dump") else d for d in sd.get("dialogue", [])],
        )
        db.add(scene)
        created.append(scene)

    await db.flush()
    for s in created:
        await db.refresh(s)
    return created


@router.get("/narrative-lens/{lens_id}/scenes", response_model=list[SceneResponse])
async def list_scenes(lens_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return (await db.execute(
        select(Scene).join(NarrativeBeat)
        .where(NarrativeBeat.lens_id == lens_id)
        .order_by(NarrativeBeat.beat_order, Scene.scene_order)
    )).scalars().all()
