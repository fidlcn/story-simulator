"""Pydantic schemas for Project."""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


# --- Request schemas ---

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    genre: Optional[str] = None
    tone: Optional[str] = None
    language: str = "zh-CN"
    target_format: str = "screenplay"
    premise: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    genre: Optional[str] = None
    tone: Optional[str] = None
    language: Optional[str] = None
    target_format: Optional[str] = None
    premise: Optional[str] = None


# --- Response schemas ---

class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    genre: Optional[str]
    tone: Optional[str]
    language: str
    target_format: str
    premise: Optional[str]
    current_simulation_id: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    data: list[ProjectResponse]
    total: int
