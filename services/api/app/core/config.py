from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Story Simulator API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/story_simulator"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # LLM — 支持任何 OpenAI 兼容 API (OpenAI / DeepSeek / Ollama 等)
    OPENAI_API_KEY: str = "sk-placeholder"
    OPENAI_API_BASE: str = ""  # 留空=OpenAI官方; DeepSeek=https://api.deepseek.com/v1
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_MAX_TOKENS: int = 4096
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_RETRIES: int = 3

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Simulation
    SNAPSHOT_INTERVAL: int = 10
    MAX_SNAPSHOTS_PER_SIMULATION: int = 20

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
