"""World Judge Agent — validates character intentions against world rules."""
from typing import Type
from pydantic import BaseModel
from app.agents.base_agent import BaseAgent
from app.agents.llm_client import LLMClient


class JudgedIntention(BaseModel):
    intention_id: str | None = None
    character_id: str
    allowed: bool
    required_cost: str | None = None
    risk: str | None = None
    modified_action: str | None = None
    rejection_reason: str | None = None
    world_consequences: list[str] = []


class WorldJudgeOutput(BaseModel):
    judgments: list[JudgedIntention]


class WorldJudgeAgent(BaseAgent):
    def __init__(self, llm_client: LLMClient):
        super().__init__(llm_client)

    @property
    def agent_name(self) -> str:
        return "world_judge"

    def get_system_prompt(self) -> str:
        with open("app/agents/prompts/world_judge.md", "r") as f:
            return f.read()

    def get_output_schema(self) -> Type[BaseModel]:
        return WorldJudgeOutput
