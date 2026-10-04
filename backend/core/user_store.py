"""Small helpers for reading/writing users.json (shared by user routers)."""
from fastapi import HTTPException
from core.database import read_json, write_json
from core.auth import USERS_FILE


def load_users() -> list:
    users = read_json(USERS_FILE)
    return users if isinstance(users, list) else []


def save_users(users: list) -> None:
    write_json(USERS_FILE, users)


def find_user(users: list, user_id: str) -> dict:
    user = next((u for u in users if str(u.get("id")) == str(user_id)), None)
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return user


def public_user(u: dict) -> dict:
    return {k: u.get(k) for k in ("id", "username", "role", "name", "mitarbeiter_id")}


def admin_count(users: list) -> int:
    return sum(1 for u in users if u.get("role") == "admin")
