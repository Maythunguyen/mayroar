from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    supabase_url: str
    supabase_publishable_key: str
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    allowed_origins: list[str] = ["http://localhost:8081", "http://127.0.0.1:8081"]


@lru_cache
def settings() -> Settings:
    return Settings()
