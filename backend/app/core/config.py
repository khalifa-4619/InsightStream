import os
import urllib
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# Get the absolute path of the directory where config.py is
# This moves up two levels to find the 'backend' root where .env lives
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
ENV_PATH = os.path.join(BASE_DIR, ".env")

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "InsightStream"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str
    
    @property
    def DATABASE_URL(self) -> str:
        # this quotes the password so special characters don't break the URL
        password = urllib.parse.quote_plus(self.POSTGRES_PASSWORD)
        return f"postgresql://{self.POSTGRES_USER}:{password}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Use the absolute path to the env file
    model_config = SettingsConfigDict(env_file=ENV_PATH)

settings = Settings()