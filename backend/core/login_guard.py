"""In-memory brute-force protection: lock a username after N failed logins."""
import time
from fastapi import HTTPException
from core.security_settings import get_security_settings

_STATE = {}  # username(lower) -> {"count": int, "locked_until": float}


def check_not_locked(username: str) -> None:
    entry = _STATE.get(username.lower())
    if entry and entry["locked_until"] > time.time():
        minutes = int((entry["locked_until"] - time.time()) // 60) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Konto vorübergehend gesperrt. Erneut versuchen in {minutes} Min.",
        )


def register_failure(username: str) -> None:
    s = get_security_settings()
    if s["max_failed_attempts"] == 0:
        return
    entry = _STATE.setdefault(username.lower(), {"count": 0, "locked_until": 0.0})
    if entry["locked_until"] and entry["locked_until"] <= time.time():
        entry["count"], entry["locked_until"] = 0, 0.0  # old lock expired
    entry["count"] += 1
    if entry["count"] >= s["max_failed_attempts"]:
        entry["locked_until"] = time.time() + s["lockout_minutes"] * 60


def register_success(username: str) -> None:
    _STATE.pop(username.lower(), None)


def locked_usernames() -> list[dict]:
    now = time.time()
    return [
        {"username": u, "minutes_left": int((e["locked_until"] - now) // 60) + 1}
        for u, e in _STATE.items() if e["locked_until"] > now
    ]


def unlock(username: str) -> None:
    _STATE.pop(username.lower(), None)
