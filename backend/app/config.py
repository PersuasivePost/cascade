"""
Central configuration. Everything here is read from environment variables —
nothing that looks like a secret is ever hardcoded or committed.

Required for the app to talk to the database:
    NEO4J_URI       e.g. bolt+s://<instance-id>.databases.cognodb.cloud
    NEO4J_USER      cognodb
    NEO4J_PASSWORD  the one-time password shown when you created the instance

Optional, enables the AI incident-summary feature. If absent, the app falls
back to a template-based summary so the core product still works without it:
    ANTHROPIC_API_KEY
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    neo4j_uri: str = ""
    neo4j_user: str = "cognodb"
    neo4j_password: str = ""

    anthropic_api_key: str | None = None

    cors_origins: str = "http://localhost:3000"

    @property
    def is_configured(self) -> bool:
        return bool(self.neo4j_uri and self.neo4j_user and self.neo4j_password)


@lru_cache
def get_settings() -> Settings:
    return Settings()
