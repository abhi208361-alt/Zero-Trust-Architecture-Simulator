from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app.db"
    JWT_SECRET_KEY: str = Field(min_length=32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    ENABLE_DEMO_DATA: bool = False
    VIEWER_PASSWORD: str | None = Field(default=None, min_length=8)
    ANALYST_PASSWORD: str | None = Field(default=None, min_length=8)
    ADMIN_PASSWORD: str | None = Field(default=None, min_length=8)

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def reject_placeholder_secret(cls, value: str) -> str:
        normalized = value.strip().lower()
        placeholders = (
            "change-me",
            "replace-with",
            "generate-a-random",
            "your-secret",
            "secret-key",
            "default-secret",
        )
        if any(normalized.startswith(prefix) for prefix in placeholders) or len(set(value)) < 8:
            raise ValueError("JWT_SECRET_KEY must be a deployment-provided random secret")
        return value

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()