from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase
    supabase_url: str = "https://your-project.supabase.co"
    supabase_key: str = "your-anon-or-service-role-key"

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # CORS
    frontend_url: str = "http://localhost:3000"
    chrome_extension_id: str = ""

    # App
    upload_dir: str = "./temp"
    max_file_size_mb: int = 100


settings = Settings()
