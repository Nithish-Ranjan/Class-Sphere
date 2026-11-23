"""
ClassSphere Centralized Configuration Module.
Loads environment variables safely using Pydantic Settings v2.
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    PROJECT_NAME: str = "ClassSphere Core API"
    API_V1_PREFIX: str = "/api/v1"

    # PostgreSQL Connection Configuration
    POSTGRES_SERVER: str = "127.0.0.1"
    POSTGRES_PORT: int = 5434
    POSTGRES_DB: str = "classsphere"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres_dev_password"

    # Dedicated Database Roles
    MIGRATOR_USER: str = "classsphere_migrator"
    MIGRATOR_PASSWORD: str = "migrator_secure_pass_2026"

    APP_DB_USER: str = "classsphere_app"
    APP_DB_PASSWORD: str = "app_secure_pass_2026"

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://classsphere_app:app_secure_pass_2026@127.0.0.1:5434/classsphere"
    )
    MIGRATION_DATABASE_URL: str = Field(
        default="postgresql+psycopg://classsphere_migrator:migrator_secure_pass_2026@127.0.0.1:5434/classsphere"
    )
    ADMIN_DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:postgres_dev_password@127.0.0.1:5434/classsphere"
    )

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

    # JWT RS256 Settings
    JWT_ALGORITHM: str = "RS256"
    JWT_PRIVATE_KEY: Optional[str] = None
    JWT_PUBLIC_KEY: Optional[str] = None
    JWT_PRIVATE_KEY_PATH: Optional[str] = ".keys/jwt_rsa_private.pem"
    JWT_PUBLIC_KEY_PATH: Optional[str] = ".keys/jwt_rsa_public.pem"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_ISSUER: str = "classsphere-auth"
    JWT_AUDIENCE: str = "classsphere-api"

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

    def get_jwt_private_key(self) -> str:
        """Returns the RSA private key in PEM format."""
        if self.JWT_PRIVATE_KEY:
            return self.JWT_PRIVATE_KEY
        if self.JWT_PRIVATE_KEY_PATH:
            path = self.JWT_PRIVATE_KEY_PATH
            if not os.path.isabs(path):
                path = os.path.join(BASE_DIR, path)
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    return f.read()
        if self.ENVIRONMENT == "production":
            raise RuntimeError("JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_PATH must be configured in production!")
        return _get_or_create_dev_keypair()[0]

    def get_jwt_public_key(self) -> str:
        """Returns the RSA public key in PEM format."""
        if self.JWT_PUBLIC_KEY:
            return self.JWT_PUBLIC_KEY
        if self.JWT_PUBLIC_KEY_PATH:
            path = self.JWT_PUBLIC_KEY_PATH
            if not os.path.isabs(path):
                path = os.path.join(BASE_DIR, path)
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    return f.read()
        if self.ENVIRONMENT == "production":
            raise RuntimeError("JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH must be configured in production!")
        return _get_or_create_dev_keypair()[1]

_cached_dev_keypair = None

def _get_or_create_dev_keypair():
    global _cached_dev_keypair
    if _cached_dev_keypair is None:
        key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        priv_pem = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode("utf-8")
        pub_pem = key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode("utf-8")
        _cached_dev_keypair = (priv_pem, pub_pem)
    return _cached_dev_keypair

settings = Settings()
