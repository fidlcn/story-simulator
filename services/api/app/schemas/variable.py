"""Pydantic schemas for VariableInjection."""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class VariableCreate(BaseModel):
    type: str
    description: str = Field(..., min_length=1)
    affected_entity_ids: list[uuid.UUID] = []
    constraints: list[str] = []
    intended_pressure: Optional[str] = None
    introduced_at_tick: Optional[int] = None  # defaults to current tick


class VariableResponse(BaseModel):
    id: uuid.UUID
    simulation_id: uuid.UUID
    introduced_at_tick: int
    type: str
    description: str
    affected_entity_ids: list
    constraints: list
    intended_pressure: Optional[str]
    created_by: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
