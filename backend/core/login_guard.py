"""In-memory brute-force protection: lock a username after N failed logins.

Counted per username *and* client address, so someone guessing from one machine cannot
lock the real owner out on theirs.
"""
import time
from fastapi import HTTPException
from core.security_settings import get_security_settings

_STATE = {}  # "username(lower)|ip" -> {"count": int, "locked_until": float}


def _key(username: str, ip: str) -> str:
    return f"{username.lower()}|{ip}"


def check_not_locked(username: str, ip: str) -> None:
    entry = _STATE.get(_key(username, ip))
    if entry and entry["locked_until"] > time.time():
        minutes = int((entry["locked_until"] - time.time()) // 60) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Konto vorübergehend gesperrt. Erneut versuchen in {minutes} Min.",
        )


def register_failure(username: str, ip: str) -> None:
    s = get_security_settings()
    if s["max_failed_attempts"] == 0:
        return
    entry = _STATE.setdefault(_key(username, ip), {"count": 0, "locked_until": 0.0})
    if entry["locked_until"] and entry["locked_until"] <= time.time():
        entry["count"], entry["locked_until"] = 0, 0.0  # old lock expired
    entry["count"] += 1
    if entry["count"] >= s["max_failed_attempts"]:
        entry["locked_until"] = time.time() + s["lockout_minutes"] * 60


def register_success(username: str, ip: str) -> None:
    _STATE.pop(_key(username, ip), None)


def locked_usernames() -> list[dict]:
    now = time.time()
    return [
        {"username": k.rsplit("|", 1)[0], "ip": k.rsplit("|", 1)[1], "minutes_left": int((e["locked_until"] - now) // 60) + 1}
        for k, e in _STATE.items() if e["locked_until"] > now
    ]


def unlock(username: str) -> None:
    """Lift every lock on this username, from whichever address."""
    for k in [k for k in _STATE if k.rsplit("|", 1)[0] == username.lower()]:
        _STATE.pop(k, None)
