"""Seed Generation Agent — generates world and character seeds."""
from typing import Type
from pydantic import BaseModel, Field
from app.agents.base_agent import BaseAgent
from app.agents.llm_client import LLMClient


class WorldDraft(BaseModel):
    era: str
    geography: str
    political_structure: str
    economy: str
    technology_level: str
    magic_or_power_system: str | None = None
    social_rules: list[str] = []
    cultural_norms: list[str] = []
    current_instability: str
    initial_facts: list[str] = []


class ResourceDraft(BaseModel):
    resource_type: str
    name: str
    description: str = ""
    quantity: float = 1


class RelationshipDraft(BaseModel):
    target_name: str
    relationship_type: str
    description: str = ""


class SecretDraft(BaseModel):
    content: str
    impact: str = ""


class CharacterDraft(BaseModel):
    name: str
    role_type: str
    public_identity: str
    private_identity: str | None = None
    backstory: str
    public_goal: str
    hidden_goal: str | None = None
    desire: str
    fear: str
    misbelief: str | None = None
    moral_boundary: str | None = None
    personality_traits: list[str] = []
    values: list[str] = []
    resources: list[ResourceDraft] = []
    relationships: list[RelationshipDraft] = []
    secrets: list[SecretDraft] = []


class FactionDraft(BaseModel):
    name: str
    faction_type: str
    description: str
    goals: list[str] = []
    ideology: str = ""


class ConflictDraft(BaseModel):
    description: str
    involved_characters: list[str]
    tension_level: int = Field(5, ge=1, le=10)


class ProtagonistCandidate(BaseModel):
    character_name: str
    reason: str
    suggested_lens: str


class SeedGenerationOutput(BaseModel):
    world: WorldDraft
    characters: list[CharacterDraft]
    factions: list[FactionDraft] = []
    initial_conflicts: list[ConflictDraft] = []
    protagonist_candidates: list[ProtagonistCandidate]


class SeedGenerationAgent(BaseAgent):
    def __init__(self, llm_client: LLMClient):
        super().__init__(llm_client)

    @property
    def agent_name(self) -> str:
        return "seed_generation"

    def get_system_prompt(self) -> str:
        with open("app/agents/prompts/seed_generation.md", "r") as f:
            return f.read()

    def get_output_schema(self) -> Type[BaseModel]:
        return SeedGenerationOutput
