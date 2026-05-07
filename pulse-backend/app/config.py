from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str          # Pulse-owned tables (pulse_*)
    scenara_database_url: str = ""  # Scenara read-only tables; falls back to database_url if not set
    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION_32_CHARS_MIN"
    jwt_algorithm: str = "HS256"
    access_token_expire_hours: int = 8
    cors_allow_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
