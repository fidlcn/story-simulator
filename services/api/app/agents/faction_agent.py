"""Faction Agent — simulates collective actors (organizations, nations, etc.)."""
from typing import Type
from pydantic import BaseModel, Field
from app.agents.base_agent import BaseAgent
from app.agents.llm_client import LLMClient


class FactionIntention(BaseModel):
    faction_id: str
    tick: int
    intention_type: str = Field(description="One of: expand, defend, negotiate, attack, infiltrate, manipulate, retreat, consolidate")
    target_entity_id: str | None = None
    description: str
    reason: str
    resource_cost: dict = {}
    pressure_on_characters: list[str] = []


class FactionAgentOutput(BaseModel):
    intentions: list[FactionIntention]


class FactionAgent(BaseAgent):
    def __init__(self, llm_client: LLMClient):
        super().__init__(llm_client)

    @property
    def agent_name(self) -> str:
        return "faction_agent"

    def get_system_prompt(self) -> str:
        return (
            "你正在模拟一个组织/势力。\n\n"
            "你的任务是基于势力目标、资源、意识形态和近期形势决定下一步行动。\n"
            "势力行动会对个人角色施加压力。\n\n"
            "通用约束:\n"
            "- 你不能修改已锁定事实。\n"
            "- 你必须返回符合 schema 的 JSON。\n"
            "- 如果上下文不足，不要胡乱猜测。\n"
        )

    def get_output_schema(self) -> Type[BaseModel]:
        return FactionAgentOutput
