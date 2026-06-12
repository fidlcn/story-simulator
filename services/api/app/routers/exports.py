"""Exports router — export narrative content for download."""
import uuid
import logging
from datetime import datetime, timezone
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.export import Export
from app.models.narrative import NarrativeLens, NarrativeBeat, Scene
from app.models.character import Character
from app.schemas.narrative import ExportCreate, ExportResponse

logger = logging.getLogger(__name__)

router = APIRouter()

BEAT_TYPE_LABELS = {
    "opening_image": "开场画面", "inciting_incident": "激励事件", "debate": "犹豫挣扎",
    "first_turning_point": "第一转折", "rising_pressure": "压力升级", "midpoint": "中点",
    "reversal": "逆转", "crisis": "危机", "climax": "高潮", "resolution": "结局",
}


@router.post("/simulations/{simulation_id}/exports", response_model=ExportResponse)
async def create_export(
    simulation_id: uuid.UUID,
    data: ExportCreate,
    db: AsyncSession = Depends(get_db),
):
    """Generate export content synchronously and return the result."""
    title = data.title or "导出"

    # If lens_id provided, export that specific narrative
    if data.lens_id:
        content = await _generate_narrative_content(db, data.lens_id, data.format)
    else:
        raise HTTPException(400, "请选择一个叙事视角 (lens_id)")

    export = Export(
        simulation_id=simulation_id,
        lens_id=data.lens_id,
        export_type=data.export_type,
        format=data.format,
        title=title,
        content=content,
        status="completed",
        completed_at=datetime.now(timezone.utc),
    )
    db.add(export)
    await db.flush()
    await db.refresh(export)
    return export


@router.get("/simulations/{simulation_id}/exports", response_model=list[ExportResponse])
async def list_exports(simulation_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return (await db.execute(
        select(Export).where(Export.simulation_id == simulation_id).order_by(Export.created_at.desc())
    )).scalars().all()


@router.get("/exports/{export_id}", response_model=ExportResponse)
async def get_export(export_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    export = await db.get(Export, export_id)
    if not export:
        raise HTTPException(404, "Export not found")
    return export


@router.get("/exports/{export_id}/download")
async def download_export(export_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    export = await db.get(Export, export_id)
    if not export:
        raise HTTPException(404, "Export not found")
    if export.status != "completed":
        raise HTTPException(409, f"Export status is '{export.status}', not ready for download")
    if not export.content:
        raise HTTPException(404, "Export content is empty")

    ext = {"markdown": "md", "fountain": "fountain"}.get(export.format, "txt")
    mime = {"markdown": "text/markdown; charset=utf-8", "fountain": "text/plain; charset=utf-8"}.get(export.format, "text/plain; charset=utf-8")
    filename = f"{export.title or 'export'}.{ext}"

    return PlainTextResponse(
        content=export.content,
        media_type=mime,
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


# ── Content Generation ──

async def _generate_narrative_content(
    db: AsyncSession,
    lens_id: uuid.UUID,
    fmt: str,
) -> str:
    """Generate export content from a narrative lens's beats and scenes."""
    lens = await db.get(NarrativeLens, lens_id)
    if not lens:
        raise HTTPException(404, "Narrative lens not found")

    # Load characters for name resolution
    protagonist_uuids = []
    for pid in lens.protagonist_ids:
        try:
            protagonist_uuids.append(uuid.UUID(pid))
        except ValueError:
            pass
    chars = (await db.execute(
        select(Character).where(Character.id.in_(protagonist_uuids))
    )).scalars().all() if protagonist_uuids else []
    char_map = {str(c.id): c.name for c in chars}

    # Load beats
    beats = (await db.execute(
        select(NarrativeBeat).where(NarrativeBeat.lens_id == lens_id).order_by(NarrativeBeat.beat_order)
    )).scalars().all()

    if not beats:
        raise HTTPException(400, "该叙事没有节拍，请先生成节拍")

    # Load scenes
    beat_ids = [b.id for b in beats]
    scenes = (await db.execute(
        select(Scene).where(Scene.beat_id.in_(beat_ids)).order_by(Scene.beat_id, Scene.scene_order)
    )).scalars().all()
    scenes_by_beat: dict[str, list] = {}
    for s in scenes:
        scenes_by_beat.setdefault(str(s.beat_id), []).append(s)

    struct_label = {
        "single": "单一主角", "dual": "双主角", "ensemble_primary": "群像",
        "antihero": "反英雄", "tragic": "悲剧",
    }.get(lens.structure, lens.structure)

    narr_label = {
        "three_act": "三幕剧", "five_act": "五幕剧", "hero_journey": "英雄之旅",
        "kishotenketsu": "起承转合",
    }.get(lens.preferred_narrative_structure, lens.preferred_narrative_structure)

    protag_names = "、".join(char_map.get(pid, pid) for pid in lens.protagonist_ids)

    if fmt == "fountain":
        return _format_fountain(lens, beats, scenes_by_beat, char_map, protag_names)
    else:
        return _format_markdown(lens, beats, scenes_by_beat, char_map, struct_label, narr_label, protag_names)


def _format_markdown(
    lens, beats, scenes_by_beat, char_map, struct_label, narr_label, protag_names,
) -> str:
    parts = []
    parts.append(f"# 叙事剧本\n")
    parts.append(f"- **视角结构**：{struct_label}")
    parts.append(f"- **叙事结构**：{narr_label}")
    parts.append(f"- **主角**：{protag_names}")
    if lens.central_question:
        parts.append(f"- **核心问题**：{lens.central_question}")
    if lens.emotional_spine:
        parts.append(f"- **情感主线**：{lens.emotional_spine}")
    parts.append("")

    for b in beats:
        type_label = BEAT_TYPE_LABELS.get(b.beat_type, b.beat_type)
        protag = char_map.get(str(b.protagonist_id), "")
        parts.append(f"## Beat {b.beat_order}：{type_label}")
        if protag:
            parts.append(f"**视角**：{protag}\n")
        if b.summary:
            parts.append(f"{b.summary}\n")
        if b.dramatic_purpose:
            parts.append(f"> 🎯 戏剧目的：{b.dramatic_purpose}")
        if b.emotional_turn:
            parts.append(f"> 💫 情感转折：{b.emotional_turn}")
        parts.append("")

        beat_scenes = scenes_by_beat.get(str(b.id), [])
        for s in beat_scenes:
            parts.append(f"### 场景 {s.scene_order}")
            if s.heading:
                parts.append(f"**{s.heading}**")
            if s.location:
                parts.append(f"📍 {s.location}" + (f" · {s.time_of_day}" if s.time_of_day else ""))
            if s.characters:
                names = "、".join(char_map.get(cid, cid) for cid in s.characters)
                parts.append(f"👥 {names}")
            parts.append("")
            if s.scene_goal:
                parts.append(f"🎯 **目标**：{s.scene_goal}")
            if s.conflict:
                parts.append(f"⚔️ **冲突**：{s.conflict}")
            if s.turn:
                parts.append(f"🔄 **转折**：{s.turn}")
            if s.action:
                parts.append(f"\n{s.action}\n")
            if s.dialogue:
                parts.append("")
                for d in s.dialogue:
                    line = f"**{d.get('character_name', '')}**"
                    if d.get('parenthetical'):
                        line += f" *({d['parenthetical']})*"
                    line += f"：{d.get('text', '')}"
                    parts.append(line)
                parts.append("")
            parts.append("---\n")

    return "\n".join(parts)


def _format_fountain(
    lens, beats, scenes_by_beat, char_map, protag_names,
) -> str:
    parts = []
    parts.append(f"Title: 叙事剧本")
    parts.append(f"Credit: 由 AI 叙事引擎生成")
    parts.append(f"Author: {protag_names}")
    parts.append(f"Draft date: {datetime.now().strftime('%Y-%m-%d')}")
    parts.append("")

    for b in beats:
        type_label = BEAT_TYPE_LABELS.get(b.beat_type, b.beat_type)
        beat_scenes = scenes_by_beat.get(str(b.id), [])

        for s in beat_scenes:
            # Scene heading
            heading = s.heading or f"BEAT {b.beat_order} - {type_label}"
            parts.append(f".{heading.upper()}")
            parts.append("")

            # Action
            if s.action:
                parts.append(s.action)
                parts.append("")

            # Dialogue
            for d in s.dialogue:
                name = d.get("character_name", "CHARACTER").upper()
                parts.append(name)
                if d.get("parenthetical"):
                    parts.append(f"({d['parenthetical']})")
                parts.append(d.get("text", ""))
                parts.append("")

            parts.append("")

    return "\n".join(parts)
