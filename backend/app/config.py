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
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
