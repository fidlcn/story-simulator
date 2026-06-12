"""Conflict Resolver Agent — merges intentions into event candidates."""
from typing import Type
from pydantic import BaseModel, Field
from app.agents.base_agent import BaseAgent
from app.agents.llm_client import LLMClient


class StateChangeDraft(BaseModel):
    target_type: str
    target_id: str
    field: str
    new_value: str
    reason: str


class EventCandidate(BaseModel):
    candidate_id: str | None = None
    title: str
    summary: str
    event_type: str
    participants: list[str] = []
    causes: list[str] = []
    likely_effects: list[str] = []
    location: str | None = None
    dramatic_potential: int = Field(50, ge=0, le=100)
    state_changes: list[StateChangeDraft] = []


class ConflictResolverOutput(BaseModel):
    candidates: list[EventCandidate]


class ConflictResolverAgent(BaseAgent):
    def __init__(self, llm_client: LLMClient):
        super().__init__(llm_client)

    @property
    def agent_name(self) -> str:
        return "conflict_resolver"

    def get_system_prompt(self) -> str:
        with open("app/agents/prompts/conflict_resolver.md", "r") as f:
            return f.read()

    def get_output_schema(self) -> Type[BaseModel]:
        return ConflictResolverOutput
