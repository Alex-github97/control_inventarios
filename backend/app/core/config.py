from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    PROJECT_NAME: str = "Control de Inventarios"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    DATABASE_URL: str = "postgresql+asyncpg://ci_user:ci_pass@localhost:5432/control_inventarios"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40

    REDIS_URL: str = "redis://localhost:6379/0"
    # Las sesiones van en su propia base lógica de Redis: así una carga de
    # caché nunca puede expulsar la sesión de alguien que está trabajando.
    # Vacío = la misma instancia de REDIS_URL, base 1.
    REDIS_SESIONES_URL: str = ""

    @property
    def redis_sesiones_url(self) -> str:
        if self.REDIS_SESIONES_URL:
            return self.REDIS_SESIONES_URL
        base = self.REDIS_URL.rsplit("/", 1)[0] if self.REDIS_URL.rsplit("/", 1)[-1].isdigit() else self.REDIS_URL.rstrip("/")
        return base + "/1"

    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    # El token dura lo mismo que el tope absoluto de la sesión; lo que de verdad
    # la cierra antes es la inactividad, que se controla en el servidor
    # (core/sesiones.py).
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    REFRESH_TOKEN_EXPIRE_DAYS: int = 1
    SESION_INACTIVIDAD_MIN: int = 10
    SESION_MAXIMA_HORAS: int = 12

    @field_validator("SECRET_KEY")
    @classmethod
    def clave_de_firma_segura(cls, v):
        # Con la clave de ejemplo o una corta, cualquiera que la adivine firma
        # tokens de administrador de cualquier empresa. En producción no arranca.
        import os
        if os.getenv("ENVIRONMENT", "development") != "development" and (
                v.startswith("change-me-in-production") or len(v) < 32):
            raise ValueError("SECRET_KEY debe ser aleatoria y de al menos 32 caracteres en producción")
        return v

    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # Asistente de reuniones del CRM. Sin clave, la función responde que no
    # está configurada en vez de fallar a mitad de una reunión. Los modelos van
    # en variables porque OpenAI los renombra y retira (los gpt-4o-*transcribe
    # se apagan el 26 de febrero de 2027).
    OPENAI_API_KEY: str = ""
    OPENAI_MODELO_TRANSCRIPCION: str = "gpt-transcribe"
    OPENAI_MODELO_VIVO: str = "gpt-live-transcribe"
    OPENAI_MODELO_EXTRACCION: str = "gpt-6-astra"
    # El bot que entra a las reuniones virtuales (Vexa autoalojado, en su propio
    # servidor). Vacío = sin bot: las reuniones virtuales se graban desde la
    # aplicación o se sube la grabación.
    VEXA_URL: str = ""
    VEXA_API_KEY: str = ""
    # Cuánto espera el bot a que lo admitan antes de rendirse (min).
    VEXA_ESPERA_ADMISION_MIN: int = 15

    SAP_HOST: str = ""
    SAP_PORT: int = 443
    SAP_CLIENT: str = "100"
    SAP_USER: str = ""
    SAP_PASSWORD: str = ""
    SAP_ENABLED: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
