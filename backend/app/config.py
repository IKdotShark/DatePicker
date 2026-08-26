from functools import cached_property, lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = Field(..., alias="DATABASE_URL")
    secret_key: str = Field(..., alias="SECRET_KEY", min_length=32)

    cors_origins_raw: str = Field(default="", alias="CORS_ORIGINS")
    public_base_url: str = Field(default="http://localhost", alias="PUBLIC_BASE_URL")

    admin_username: str = Field(default="admin", alias="ADMIN_USERNAME")
    admin_password: str = Field(default="admin", alias="ADMIN_PASSWORD")

    initial_invitation_name: str = Field(default="Гость", alias="INITIAL_INVITATION_NAME")

    session_cookie_name: str = Field(default="dp_session", alias="SESSION_COOKIE_NAME")
    session_max_age_seconds: int = Field(default=86400, alias="SESSION_MAX_AGE_SECONDS")

    telegram_bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")
    telegram_chat_id: str = Field(default="", alias="TELEGRAM_CHAT_ID")
    notify_webhook_url: str = Field(default="", alias="NOTIFY_WEBHOOK_URL")

    upload_dir: str = Field(default="/app/data/uploads", alias="UPLOAD_DIR")

    @cached_property
    def cors_origins(self) -> List[str]:
        return [s.strip() for s in self.cors_origins_raw.split(",") if s.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
