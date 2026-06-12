"""Pydantic schemas for Simulation and SimulationEvent."""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class SimulationCreate(BaseModel):
    name: Optional[str] = None
    config: dict = {}


class SimulationResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: Optional[str]
    status: str
    current_tick: int
    parent_simulation_id: Optional[uuid.UUID]
    branch_reason: Optional[str]
    config: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventResponse(BaseModel):
    id: uuid.UUID
    simulation_id: uuid.UUID
    tick: int
    title: str
    summary: str
    event_type: str
    participants: list
    location: Optional[str]
    causes: list
    effects: list
    visibility: list
    emotional_impact: list
    world_state_changes: list
    character_state_changes: list
    relationship_state_changes: list
    locked: bool
    created_by: str
    consistency_notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class EventFilters(BaseModel):
    tick: Optional[int] = None
    event_type: Optional[str] = None
    participant_id: Optional[uuid.UUID] = None
    page: int = 1
    page_size: int = 20


class TimelineResponse(BaseModel):
    ticks: list[dict]


class ContinuousRunConfig(BaseModel):
    tick_count: int = Field(10, ge=1, le=100)
    stop_on: dict = {}
