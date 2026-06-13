"""RuntimeConfig — mutable LLM settings that persist across restarts."""
import json
import logging
from pathlib import Path
from pydantic import BaseModel
from app.core.config import get_settings

logger = logging.getLogger(__name__)

CONFIG_FILE = Path(__file__).resolve().parent.parent.parent / "runtime_config.json"


class LLMSettings(BaseModel):
    api_key: str
    api_base: str
    model: str
    max_tokens: int
    temperature: float
    language: str = "zh"


def _defaults() -> LLMSettings:
    s = get_settings()
    return LLMSettings(
        api_key=s.OPENAI_API_KEY,
        api_base=s.OPENAI_API_BASE,
        model=s.LLM_MODEL,
        max_tokens=s.LLM_MAX_TOKENS,
        temperature=s.LLM_TEMPERATURE,
    )


class _RuntimeConfigStore:
    """Singleton store — holds current LLM settings in memory."""

    def __init__(self):
        self._settings = _defaults()
        self._load_from_file()

    def _load_from_file(self):
        if CONFIG_FILE.exists():
            try:
                data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
                self._settings = LLMSettings(**data)
                logger.info("Loaded runtime config from %s", CONFIG_FILE.name)
            except Exception as e:
                logger.warning("Failed to load runtime config: %s, using defaults", e)
        else:
            logger.info("No runtime_config.json found, using .env defaults")

    def get(self) -> LLMSettings:
        return self._settings

    def update(self, **kwargs) -> LLMSettings:
        data = self._settings.model_dump()
        for k, v in kwargs.items():
            if v is not None:
                data[k] = v
        self._settings = LLMSettings(**data)
        self._save_to_file()
        return self._settings

    def _save_to_file(self):
        CONFIG_FILE.write_text(
            self._settings.model_dump_json(indent=2) + "\n",
            encoding="utf-8",
        )
        logger.info("Saved runtime config to %s", CONFIG_FILE.name)


_store: _RuntimeConfigStore | None = None


def get_runtime_config() -> LLMSettings:
    global _store
    if _store is None:
        _store = _RuntimeConfigStore()
    return _store.get()


def update_runtime_config(**kwargs) -> LLMSettings:
    global _store
    if _store is None:
        _store = _RuntimeConfigStore()
    return _store.update(**kwargs)
