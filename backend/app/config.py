from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = ConfigDict(
        env_file=".env",
        env_prefix="",
        case_sensitive=False,
    )

    database_url: str = "sqlite:///./dev.db"
    app_name: str = "Smart Property Maintenance System"
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:5173,http://localhost:4173,https://daliah7.github.io"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def sqlalchemy_database_url(self) -> str:
        # Neon (and other PostgreSQL providers) give postgresql:// URLs.
        # SQLAlchemy with psycopg2 requires postgresql+psycopg2://.
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url


settings = Settings()
