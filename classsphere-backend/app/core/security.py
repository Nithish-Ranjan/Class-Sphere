"""
ClassSphere Security & Cryptography Module.
Implements Argon2id password hashing and RS256 asymmetric JWT lifecycle.
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional
from uuid import UUID

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from jose import jwt
from jose.exceptions import JWTError, ExpiredSignatureError, JWTClaimsError

from app.core.config import settings
from app.core.exceptions import AuthenticationError

# Argon2id password hasher with RFC 9106 recommended parameters
# m=65536 (64 MiB), t=3 iterations, p=4 parallelism
pwd_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
)

def get_password_hash(password: str) -> str:
    """Generates an Argon2id hash for the given plain-text password."""
    return pwd_hasher.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against an Argon2id hash."""
    try:
        return pwd_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False
    except Exception:
        return False

def create_access_token(
    user_id: UUID,
    role: str,
    institution_id: UUID,
    department_id: Optional[UUID] = None,
    expires_delta: Optional[timedelta] = None,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    """Creates a signed RS256 JWT access token (15-minute default lifetime)."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": str(uuid.uuid4()),
        "role": role,
        "tenant_id": str(institution_id),
        "dept_id": str(department_id) if department_id else None,
        "token_use": "access",
    }
    if extra_claims:
        payload.update(extra_claims)

    private_key = settings.get_jwt_private_key()
    return jwt.encode(payload, private_key, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(
    user_id: UUID,
    institution_id: UUID,
    department_id: Optional[UUID] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Creates a signed RS256 JWT refresh token (7-day default lifetime)."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "jti": str(uuid.uuid4()),
        "tenant_id": str(institution_id),
        "dept_id": str(department_id) if department_id else None,
        "token_use": "refresh",
    }
    private_key = settings.get_jwt_private_key()
    return jwt.encode(payload, private_key, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str, expected_token_use: str = "access") -> Dict[str, Any]:
    """
    Decodes and validates an RS256 token against the public key.
    Enforces expiration, issuer, audience, and expected token_use.
    """
    public_key = settings.get_jwt_public_key()
    try:
        claims = jwt.decode(
            token,
            public_key,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE,
            options={"verify_exp": True, "verify_aud": True, "verify_iss": True},
        )
    except ExpiredSignatureError:
        raise AuthenticationError("Token has expired", code="TOKEN_EXPIRED")
    except JWTClaimsError as e:
        raise AuthenticationError(f"Invalid token claims: {str(e)}", code="INVALID_CLAIMS")
    except JWTError as e:
        raise AuthenticationError(f"Could not validate token signature: {str(e)}", code="INVALID_SIGNATURE")

    # Enforce mandatory standard claims
    for required_claim in ("sub", "iss", "aud", "iat", "exp", "jti", "token_use"):
        if required_claim not in claims:
            raise AuthenticationError(f"Missing required claim: {required_claim}", code="INVALID_CLAIMS")

    if claims.get("token_use") != expected_token_use:
        raise AuthenticationError(
            f"Expected token_use='{expected_token_use}', got '{claims.get('token_use')}'",
            code="INVALID_TOKEN_USE",
        )

    return claims
