"""
LLM client — reads the active configuration from database at call time.
"""
from openai import OpenAI
from core.database import SessionLocal


PROVIDER_DEFAULTS = {
    "qwen": {
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "model": "qwen3.6-plus",
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com",
        "model": "deepseek-chat",
    },
}


def get_active_llm_config() -> dict:
    """
    Load active LLM config from database.
    Returns dict with provider, api_key, base_url, model.
    Raises RuntimeError when no active config exists.
    """
    from models.llm_config import LLMConfig

    db = SessionLocal()
    try:
        config = db.query(LLMConfig).filter(LLMConfig.is_active == True).first()
        if not config:
            raise RuntimeError("No active LLM config found. Configure one in admin first.")
        return {
            "provider": config.provider,
            "api_key": config.api_key,
            "base_url": config.base_url,
            "model": config.model,
        }
    finally:
        db.close()


def get_llm_client() -> tuple[OpenAI, str]:
    """
    Returns (OpenAI client, model_name) using the active config.
    Always reads fresh from DB so admin changes take effect immediately.
    """
    config = get_active_llm_config()
    client = OpenAI(
        api_key=config["api_key"],
        base_url=config["base_url"],
    )
    return client, config["model"]
