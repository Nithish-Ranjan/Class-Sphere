"""
Test Suite 12: Argon2id Password Security & Hashing Guarantees.
Verifies RFC 9106 Argon2id parameters, verification mechanics, salt uniqueness,
and safe handling of malformed hashes without crashing or credential leakage.
"""
from app.core.security import get_password_hash, verify_password

def test_argon2id_hash_generation():
    """Argon2id hashes must adhere to RFC 9106 parameters (m=65536, t=3, p=4)."""
    raw_password = "InstitutionalPassword2026!"
    hashed = get_password_hash(raw_password)

    # Verify standard Argon2id header and parameters
    assert hashed.startswith("$argon2id$v=19$m=65536,t=3,p=4$")
    assert raw_password not in hashed
    assert len(hashed) >= 80

def test_argon2id_salt_uniqueness():
    """Hashing identical passwords produces distinct hashes due to cryptographically random salts."""
    pwd = "IdenticalPassword99"
    h1 = get_password_hash(pwd)
    h2 = get_password_hash(pwd)
    assert h1 != h2, "Salts must be randomly generated and unique per invocation!"
    assert verify_password(pwd, h1) is True
    assert verify_password(pwd, h2) is True

def test_correct_password_verification():
    """Correct plain-text password verifies successfully against generated hash."""
    pwd = "VerifiedSecretPassword!@#44"
    hashed = get_password_hash(pwd)
    assert verify_password(pwd, hashed) is True

def test_incorrect_password_rejection():
    """Incorrect password fails verification safely."""
    pwd = "ActualCorrectPassword"
    wrong_pwd = "WrongCandidatePassword"
    hashed = get_password_hash(pwd)
    assert verify_password(wrong_pwd, hashed) is False

def test_malformed_hash_safe_rejection():
    """Corrupt, truncated, or non-argon2 hash strings return False without throwing uncaught exceptions."""
    assert verify_password("AnyPassword", "malformed_hash_value") is False
    assert verify_password("AnyPassword", "$argon2id$v=19$corrupted_payload") is False
    assert verify_password("AnyPassword", "") is False
