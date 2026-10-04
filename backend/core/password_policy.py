"""Password policy checks, driven by the security settings."""
from core.security_settings import get_security_settings


def policy_errors(password: str) -> list[str]:
    s = get_security_settings()
    errors = []
    if len(password) < s["min_password_length"]:
        errors.append(f"mindestens {s['min_password_length']} Zeichen")
    if s["require_digit"] and not any(c.isdigit() for c in password):
        errors.append("mindestens eine Ziffer")
    if s["require_uppercase"] and not any(c.isupper() for c in password):
        errors.append("mindestens ein Großbuchstabe")
    return errors


def enforce_password_policy(password: str) -> None:
    from fastapi import HTTPException
    errors = policy_errors(password)
    if errors:
        raise HTTPException(
            status_code=400,
            detail="Passwort zu schwach: " + ", ".join(errors),
        )
