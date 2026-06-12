"""Pydantic schemas for World and WorldFact."""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class WorldFactCreate(BaseModel):
    text: str = Field(..., min_length=1)
    scope: str = "global"
    status: str = "draft"
    source: str = "user"
    constraints: list[str] = []


class WorldFactResponse(BaseModel):
    id: uuid.UUID
    text: str
    scope: str
    status: str
    introduced_at_tick: Optional[int]
    source: str
    constraints: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorldUpdate(BaseModel):
    premise: Optional[str] = None
    era: Optional[str] = None
    geography: Optional[str] = None
    political_structure: Optional[str] = None
    economy: Optional[str] = None
    technology_level: Optional[str] = None
    magic_or_power_system: Optional[str] = None
    social_rules: Optional[list[str]] = None
    cultural_norms: Optional[list[str]] = None
    current_instability: Optional[str] = None


class WorldResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    premise: Optional[str] = None
    era: Optional[str] = None
    geography: Optional[str] = None
    political_structure: Optional[str] = None
    economy: Optional[str] = None
    technology_level: Optional[str] = None
    magic_or_power_system: Optional[str] = None
    social_rules: list[str] = []
    cultural_norms: list[str] = []
    current_instability: Optional[str] = None
    facts: list[WorldFactResponse] = []
    created_at: datetime
    updated_at: datetime


class WorldGenerateRequest(BaseModel):
    fields_to_generate: list[str] = []
    constraints: list[str] = []
