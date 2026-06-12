"""Pydantic schemas for Character and Relationship."""
import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class CharacterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    role_type: Optional[str] = None
    public_identity: Optional[str] = None
    private_identity: Optional[str] = None
    backstory: Optional[str] = None
    public_goal: Optional[str] = None
    hidden_goal: Optional[str] = None
    desire: Optional[str] = None
    fear: Optional[str] = None
    misbelief: Optional[str] = None
    moral_boundary: Optional[str] = None
    personality_traits: list[str] = []
    values: list[str] = []
    constraints: list[str] = []


class CharacterUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    role_type: Optional[str] = None
    public_identity: Optional[str] = None
    private_identity: Optional[str] = None
    backstory: Optional[str] = None
    public_goal: Optional[str] = None
    hidden_goal: Optional[str] = None
    desire: Optional[str] = None
    fear: Optional[str] = None
    misbelief: Optional[str] = None
    moral_boundary: Optional[str] = None
    personality_traits: Optional[list[str]] = None
    values: Optional[list[str]] = None
    constraints: Optional[list[str]] = None
    active: Optional[bool] = None


class CharacterResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    role_type: Optional[str]
    public_identity: Optional[str]
    private_identity: Optional[str]
    backstory: Optional[str]
    public_goal: Optional[str]
    hidden_goal: Optional[str]
    desire: Optional[str]
    fear: Optional[str]
    misbelief: Optional[str]
    moral_boundary: Optional[str]
    personality_traits: list[str]
    values: list[str]
    constraints: list[str]
    active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CharacterGenerateRequest(BaseModel):
    count: int = Field(5, ge=1, le=20)
    role_types: list[str] = []
    constraints: list[str] = []


class RelationshipCreate(BaseModel):
    character_id_a: uuid.UUID
    character_id_b: uuid.UUID
    relationship_type: str = Field(..., min_length=1)
    strength: int = Field(50, ge=0, le=100)
    trust: int = Field(50, ge=0, le=100)
    description: Optional[str] = None
    is_public: bool = True


class RelationshipResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    character_id_a: uuid.UUID
    character_id_b: uuid.UUID
    relationship_type: str
    strength: int
    trust: int
    description: Optional[str]
    is_public: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
