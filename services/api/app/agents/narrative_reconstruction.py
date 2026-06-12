"""Narrative Reconstruction Agent — converts timeline to story beats."""
from typing import Type
from pydantic import BaseModel
from app.agents.base_agent import BaseAgent
from app.agents.llm_client import LLMClient


class NarrativeBeatOutput(BaseModel):
    beat_order: int
    beat_type: str
    related_event_ids: list[str] = []
    protagonist_id: str
    dramatic_purpose: str
    summary: str
    emotional_turn: str


class NarrativeReconstructionOutput(BaseModel):
    beats: list[NarrativeBeatOutput]
    omitted_events: list[str] = []
    background_events: list[str] = []
    reveal_later_events: list[str] = []


class NarrativeReconstructionAgent(BaseAgent):
    def __init__(self, llm_client: LLMClient):
        super().__init__(llm_client)

    @property
    def agent_name(self) -> str:
        return "narrative_reconstruction"

    def get_system_prompt(self) -> str:
        with open("app/agents/prompts/narrative_reconstruction.md", "r") as f:
            return f.read()

    def get_output_schema(self) -> Type[BaseModel]:
        return NarrativeReconstructionOutput
