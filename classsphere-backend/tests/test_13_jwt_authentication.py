"""
Test Suite 13: RS256 JWT Authentication & Claims Lifecycle.
Verifies asymmetric RSA signing, signature verification, expiration,
claim validation (sub, iss, aud, iat, exp, jti), algorithm enforcement, and token-use separation.
"""
import uuid
from datetime import timedelta
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from jose import jwt

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.exceptions import AuthenticationError

def test_valid_access_token_lifecycle():
    """Generates and decodes a valid RS256 access token with standard 15-minute claims."""
    user_id = uuid.uuid4()
    inst_id = uuid.uuid4()
    dept_id = uuid.uuid4()

    token = create_access_token(
        user_id=user_id,
        role="FACULTY",
        institution_id=inst_id,
        department_id=dept_id,
    )
    claims = decode_token(token, expected_token_use="access")

    assert claims["sub"] == str(user_id)
    assert claims["role"] == "FACULTY"
    assert claims["tenant_id"] == str(inst_id)
    assert claims["dept_id"] == str(dept_id)
    assert claims["iss"] == settings.JWT_ISSUER
    assert claims["aud"] == settings.JWT_AUDIENCE
    assert claims["token_use"] == "access"
    assert "jti" in claims and len(claims["jti"]) == 36
    # Verify expiration window (~15 minutes)
    assert claims["exp"] - claims["iat"] == settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60

def test_valid_refresh_token_lifecycle():
    """Generates and decodes a valid RS256 refresh token with standard 7-day claims."""
    user_id = uuid.uuid4()
    inst_id = uuid.uuid4()

    refresh_tok = create_refresh_token(
        user_id=user_id,
        institution_id=inst_id,
    )
    claims = decode_token(refresh_tok, expected_token_use="refresh")

    assert claims["sub"] == str(user_id)
    assert claims["tenant_id"] == str(inst_id)
    assert claims["token_use"] == "refresh"
    assert claims["exp"] - claims["iat"] == settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400

def test_expired_token_rejected():
    """Tokens with past expiration timestamp are rejected with TOKEN_EXPIRED."""
    user_id = uuid.uuid4()
    inst_id = uuid.uuid4()

    # Expired 5 minutes ago
    expired_token = create_access_token(
        user_id=user_id,
        role="STUDENT",
        institution_id=inst_id,
        expires_delta=timedelta(minutes=-5),
    )
    with pytest.raises(AuthenticationError) as excinfo:
        decode_token(expired_token, expected_token_use="access")
    assert excinfo.value.code == "TOKEN_EXPIRED"

def test_invalid_signature_rejected():
    """Tokens signed with a foreign private key are rejected."""
    foreign_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    foreign_priv_pem = foreign_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode("utf-8")

    foreign_token = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "iat": 1000000000,
            "exp": 9999999999,
            "jti": str(uuid.uuid4()),
            "token_use": "access",
            "role": "HOD",
            "tenant_id": str(uuid.uuid4()),
        },
        foreign_priv_pem,
        algorithm="RS256"
    )

    with pytest.raises(AuthenticationError) as excinfo:
        decode_token(foreign_token, expected_token_use="access")
    assert excinfo.value.code == "INVALID_SIGNATURE"

def test_invalid_issuer_and_audience_rejected():
    """Tampered issuer or audience claims are rejected."""
    priv = settings.get_jwt_private_key()
    from datetime import datetime, timezone
    now = int(datetime.now(timezone.utc).timestamp())

    # Wrong issuer
    bad_iss_tok = jwt.encode(
        {"sub": "123", "iss": "untrusted-issuer", "aud": settings.JWT_AUDIENCE, "iat": now, "exp": now + 900, "jti": "j1", "token_use": "access"},
        priv,
        algorithm="RS256"
    )
    with pytest.raises(AuthenticationError) as excinfo:
        decode_token(bad_iss_tok, expected_token_use="access")
    assert excinfo.value.code == "INVALID_CLAIMS"

    # Wrong audience
    bad_aud_tok = jwt.encode(
        {"sub": "123", "iss": settings.JWT_ISSUER, "aud": "foreign-client", "iat": now, "exp": now + 900, "jti": "j2", "token_use": "access"},
        priv,
        algorithm="RS256"
    )
    with pytest.raises(AuthenticationError) as excinfo:
        decode_token(bad_aud_tok, expected_token_use="access")
    assert excinfo.value.code == "INVALID_CLAIMS"

def test_algorithm_substitution_rejected():
    """Attempting symmetric HS256 or 'none' algorithm is rejected by algorithm constraint."""
    # Symmetrically signed token using public key as secret
    symmetric_token = jwt.encode(
        {"sub": "123", "iss": settings.JWT_ISSUER, "aud": settings.JWT_AUDIENCE, "iat": 1700000000, "exp": 1700000900, "jti": "j3", "token_use": "access"},
        "symmetric_secret",
        algorithm="HS256"
    )
    with pytest.raises(AuthenticationError) as excinfo:
        decode_token(symmetric_token, expected_token_use="access")
    assert excinfo.value.code == "INVALID_SIGNATURE"

def test_token_use_separation_enforced():
    """Access tokens cannot be used as refresh tokens and vice-versa."""
    user_id = uuid.uuid4()
    inst_id = uuid.uuid4()

    access_tok = create_access_token(user_id=user_id, role="STUDENT", institution_id=inst_id)
    refresh_tok = create_refresh_token(user_id=user_id, institution_id=inst_id)

    # Attempting to use access token as refresh token
    with pytest.raises(AuthenticationError) as excinfo1:
        decode_token(access_tok, expected_token_use="refresh")
    assert excinfo1.value.code == "INVALID_TOKEN_USE"

    # Attempting to use refresh token as access token
    with pytest.raises(AuthenticationError) as excinfo2:
        decode_token(refresh_tok, expected_token_use="access")
    assert excinfo2.value.code == "INVALID_TOKEN_USE"
