import hashlib
import os
import secrets
from fastapi import HTTPException, Header, Depends
from typing import Optional
from core.database import read_json, write_json

USERS_FILE = "users.json"
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
        "mitarbeiter_id": user_dict.get("mitarbeiter_id") or user_dict.get("id")
    }
    SESSIONS[token] = user_info
    return token

def remove_session(token: str):
    SESSIONS.pop(token, None)

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")
    
    parts = authorization.split(" ")
    token = parts[1] if len(parts) == 2 and parts[0].lower() == "bearer" else authorization

    user = SESSIONS.get(token)
    if not user:
        raise HTTPException(status_code=401, detail="Ungültiger oder abgelaufener Token")
    return user

def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization:
        return None
    try:
        return get_current_user(authorization)
    except HTTPException:
        return None

def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Nur für Administratoren gestattet")
    return user
