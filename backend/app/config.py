from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    google_api_key: str = ""
    openai_api_key: str = ""
    tavily_api_key: str = ""
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    redis_url: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"

settings = Settings()