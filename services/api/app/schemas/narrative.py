"""Pydantic schemas for Narrative and Export."""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class BeatsGenerateRequest(BaseModel):
    """Optional request body for beat generation — allows guiding which events to include."""
    focus_event_ids: Optional[list[uuid.UUID]] = None


class NarrativeLensCreate(BaseModel):
    structure: str
    protagonist_ids: list[uuid.UUID]
    central_question: Optional[str] = None
    emotional_spine: Optional[str] = None
    excluded_event_policy: str = "summarize"
    preferred_narrative_structure: str = "three_act"


class NarrativeLensResponse(BaseModel):
    id: uuid.UUID
    simulation_id: uuid.UUID
    structure: str
    protagonist_ids: list
    central_question: Optional[str]
    emotional_spine: Optional[str]
    excluded_event_policy: str
    preferred_narrative_structure: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NarrativeBeatResponse(BaseModel):
    id: uuid.UUID
    simulation_id: uuid.UUID
    lens_id: uuid.UUID
    beat_order: int
    beat_type: str
    related_event_ids: list
    protagonist_id: uuid.UUID
    dramatic_purpose: Optional[str]
    summary: Optional[str]
    emotional_turn: Optional[str]

    model_config = {"from_attributes": True}


class SceneResponse(BaseModel):
    id: uuid.UUID
    beat_id: uuid.UUID
    scene_order: int
    heading: Optional[str]
    location: Optional[str]
    time_of_day: Optional[str]
    characters: list
    scene_goal: Optional[str]
    conflict: Optional[str]
    turn: Optional[str]
    action: Optional[str]
    dialogue: list

    model_config = {"from_attributes": True}


class ExportCreate(BaseModel):
    export_type: str
    format: str = "markdown"
    title: Optional[str] = None
    lens_id: Optional[uuid.UUID] = None


class ExportResponse(BaseModel):
    id: uuid.UUID
    simulation_id: uuid.UUID
    lens_id: Optional[uuid.UUID] = None
    export_type: str
    format: str
    title: Optional[str]
    content: Optional[str]
    status: str
    created_at: datetime
    completed_at: Optional[datetime]

    model_config = {"from_attributes": True}
