from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_EXPIRE_DAYS: int = 7

    MAX_REFERENCE_ITEMS: int = 3
    MAX_PRIOR_VERSIONS: int = 3
    BOSS_CONFIGS_PATH: str = "./boss_configs"
    FILE_UPLOAD_MAX_BYTES: int = 5 * 1024 * 1024
    FILE_STORAGE_PATH: str = "./uploads"
    ALLOWED_FILE_TYPES: str = "pdf,docx"

    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD_HASH: str
    ADMIN_SECRET_KEY: str

    SUPER_ADMIN_PASSWORD_HASH: str = ""
    SUPER_ADMIN_SECRET_KEY: str = ""

    SUBMISSION_COST: int = 10
    INITIAL_POINTS: int = 100


settings = Settings()
