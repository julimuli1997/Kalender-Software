import hashlib
import os
import secrets
import time
from fastapi import HTTPException, Header, Depends
from typing import Optional
from core.roles import ADMIN
from core.security_settings import get_security_settings
SESSIONS = {}  # token -> user_dict

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    if not salt:
        salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        bytes.fromhex(salt),
        100000
    ).hex()
    return hashed, salt

def verify_password(password: str, hashed: str, salt: str) -> bool:
    new_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(new_hash, hashed)

def create_session(user_dict: dict) -> str:
    token = secrets.token_hex(32)
    user_info = {
        "id": user_dict.get("id"),
        "username": user_dict.get("username"),
        "role": user_dict.get("role", "mitarbeiter"),
        "name": user_dict.get("name"),
        "mitarbeiter_id": user_dict.get("mitarbeiter_id") or user_dict.get("id"),
        "must_change_password": bool(user_dict.get("must_change_password")),
        "last_seen": time.time(),
    }
    SESSIONS[token] = user_info
    return token

def revoke_user_sessions(user_id: str, except_token: Optional[str] = None):
    """Log a user out everywhere (after password reset, role change, delete)."""
    for t in [t for t, u in SESSIONS.items() if str(u.get("id")) == str(user_id) and t != except_token]:
        SESSIONS.pop(t, None)

def clear_must_change(user_id: str):
    """The user set a new password: lift the change-password lock on their live sessions."""
    for u in SESSIONS.values():
        if str(u.get("id")) == str(user_id):
            u["must_change_password"] = False

def remove_session(token: str):
    SESSIONS.pop(token, None)

def _authenticate(authorization: Optional[str]) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")

    parts = authorization.split(" ")
    token = parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else authorization
    return user_for_token(token)

def user_for_token(token: Optional[str]) -> dict:
    """Resolve a session token (raises 401) and slide its expiry."""
    user = SESSIONS.get(token) if token else None
    if not user:
        raise HTTPException(status_code=401, detail="Ungültiger oder abgelaufener Token")
    timeout = get_security_settings()["session_timeout_minutes"] * 60
    if time.time() - user["last_seen"] > timeout:
        SESSIONS.pop(token, None)
        raise HTTPException(status_code=401, detail="Sitzung abgelaufen")
    user["last_seen"] = time.time()  # sliding expiry
    user["token"] = token
    return user

def _ensure_password_changed(user: dict) -> dict:
    if user.get("must_change_password"):
        raise HTTPException(status_code=403, detail="Passwortänderung erforderlich")
    return user

def get_session_user(authorization: Optional[str] = Header(None)) -> dict:
    """Valid session, even if a password change is still pending (me / logout / change-password only)."""
    return _authenticate(authorization)

def get_current_user(user: dict = Depends(get_session_user)) -> dict:
    return _ensure_password_changed(user)

def calendar_view_is_public() -> bool:
    return get_security_settings()["public_calendar_view"]

def require_calendar_view(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Read access for the TV/calendar view: open, or login-only if the admin switched that on."""
    if calendar_view_is_public():
        return None
    return _ensure_password_changed(_authenticate(authorization))

def is_admin(user: dict) -> bool:
    return user.get("role") == ADMIN

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Nur für Administratoren gestattet")
    return user

def ensure_can_edit(user: dict, mitarbeiter_id, action: str) -> None:
    """Admins may touch any appointment, everyone else only their own (`action`: 'erstellen', 'löschen', ...)."""
    if not is_admin(user) and str(mitarbeiter_id) != str(user.get("mitarbeiter_id")):
        raise HTTPException(status_code=403, detail=f"Sie können nur eigene Termine {action}.")
