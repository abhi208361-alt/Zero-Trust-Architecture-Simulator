from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Zero Trust Architecture Simulator"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite:///./zero_trust.db"

    # JWT secret key MUST be set via environment variable
    jwt_secret_key: str = Field(min_length=16)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15

    risk_threshold: int = 70
    require_trusted_device_for_high_sensitivity: bool = True
    require_mfa_for_high_sensitivity: bool = False

    auth_rate_limit_attempts: int = 5
    auth_rate_limit_window_seconds: int = 60

    # CORS configuration
    allow_origins: list = ["*"]
    allow_methods: list = ["GET", "POST", "PUT", "DELETE"]
    allow_headers: list = ["*"]

    # Security settings
    env: str = "development"

    # Default user passwords (can be overridden via environment variables)
    viewer_password: str = "viewer123!"
    analyst_password: str = "analyst123!"
    admin_password: str = "admin123!"


@lru_cache
def get_settings() -> Settings:
    return Settings()
