"""Screenplay Formatter Agent — converts beats to scenes with dialogue."""
from typing import Type
from pydantic import BaseModel
from app.agents.base_agent import BaseAgent
from app.agents.llm_client import LLMClient


class DialogueLineOutput(BaseModel):
    character_id: str
    character_name: str
    parenthetical: str | None = None
    text: str


class SceneOutput(BaseModel):
    beat_id: str
    scene_order: int
    heading: str
    location: str
    time_of_day: str
    characters: list[str] = []
    scene_goal: str
    conflict: str
    turn: str
    action: str
    dialogue: list[DialogueLineOutput] = []


class ScreenplayFormatterOutput(BaseModel):
    scenes: list[SceneOutput]


class ScreenplayFormatterAgent(BaseAgent):
    def __init__(self, llm_client: LLMClient):
        super().__init__(llm_client)

    @property
    def agent_name(self) -> str:
        return "screenplay_formatter"

    def get_system_prompt(self) -> str:
        with open("app/agents/prompts/screenplay_formatter.md", "r") as f:
            return f.read()

    def get_output_schema(self) -> Type[BaseModel]:
        return ScreenplayFormatterOutput
