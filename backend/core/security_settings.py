"""Persisted authentication / authorisation settings (security.json).

Single source of truth for password policy, session lifetime and login
lockout. Everything else reads through `get_security_settings()` so changes
made on the admin config page apply immediately without a restart.
"""
from core.database import read_json, write_json

SECURITY_FILE = "security.json"

# key -> (default, min, max); bool settings use (default, None, None)
SCHEMA = {
    "min_password_length":      (8,   4,  64),
    "require_digit":            (True, None, None),
    "require_uppercase":        (False, None, None),
    "session_timeout_minutes":  (480, 5,  10080),
    "max_failed_attempts":      (5,   0,  50),     # 0 = lockout disabled
    "lockout_minutes":          (15,  1,  1440),
    "allow_self_password_change": (True, None, None),
    "public_calendar_view":     (True, None, None),  # False = TV view/read API need a login
}

DEFAULTS = {k: v[0] for k, v in SCHEMA.items()}


def get_security_settings() -> dict:
    stored = read_json(SECURITY_FILE)
    if not isinstance(stored, dict):
        stored = {}
    return {**DEFAULTS, **{k: v for k, v in stored.items() if k in SCHEMA}}


def validate_security_settings(data: dict) -> dict:
    """Return a cleaned copy of `data`; raise ValueError on bad input."""
    clean = {}
    for key, (default, lo, hi) in SCHEMA.items():
        if key not in data:
            continue
        value = data[key]
        if isinstance(default, bool):
            if not isinstance(value, bool):
                raise ValueError(f"{key} muss true/false sein")
        else:
            if isinstance(value, bool) or not isinstance(value, int):
                raise ValueError(f"{key} muss eine ganze Zahl sein")
            if not lo <= value <= hi:
                raise ValueError(f"{key} muss zwischen {lo} und {hi} liegen")
        clean[key] = value
    return clean


def save_security_settings(data: dict) -> dict:
    merged = {**get_security_settings(), **validate_security_settings(data)}
    write_json(SECURITY_FILE, merged)
    return merged
