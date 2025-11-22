from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # API ключ читается из переменных окружения (.env файл или системные переменные)
    # НЕ храните ключи напрямую в коде!
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o-mini"  # Можно использовать gpt-4o-mini для экономии
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Позволяем переопределить значения из .env
        extra = "allow"


settings = Settings()


