"""Reading/writing users.json plus the initial-admin bootstrap (shared by the user routers)."""
from fastapi import HTTPException
from core.auth import hash_password, verify_password
from core.database import db_lock, read_list, write_json
from core.paths import USERS_FILE
from core.roles import ADMIN

DEFAULT_ADMIN_PASSWORD = "admin123"


def load_users() -> list:
    return read_list(USERS_FILE)


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
    return sum(1 for u in users if u.get("role") == ADMIN)


def ensure_default_admin() -> None:
    """Create the initial admin if none exists and force a password change while it still has the default."""
    with db_lock:
        users = load_users()
        changed = False

        if admin_count(users) == 0:
            hashed, salt = hash_password(DEFAULT_ADMIN_PASSWORD)
            users.append({
                "id": "admin_1",
                "username": "admin",
                "password_hash": hashed,
                "salt": salt,
                "role": ADMIN,
                "name": "Administrator",
                "mitarbeiter_id": "admin_1",
            })
            changed = True

        # Also catches existing installations that never changed the default password.
        for u in users:
            if (u.get("username") == "admin" and not u.get("must_change_password")
                    and verify_password(DEFAULT_ADMIN_PASSWORD, u.get("password_hash", ""), u.get("salt", ""))):
                u["must_change_password"] = True
                changed = True

        if changed:
            save_users(users)
