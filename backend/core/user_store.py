"""Reading/writing users.json plus the initial-admin bootstrap (shared by the user routers)."""
from fastapi import HTTPException
from core import auth
from core.auth import hash_password, verify_password
from core.database import db_lock, read_list, write_json
from core.paths import USERS_FILE
from core.roles import ADMIN

DEFAULT_ADMIN_PASSWORD = "admin123"


def load_users() -> list:
    return read_list(USERS_FILE)


def save_users(users: list) -> None:
    write_json(USERS_FILE, users)


def set_password(user: dict, password: str) -> None:
    user["password_hash"], user["salt"] = hash_password(password)
    user["iterations"] = auth.PBKDF2_ITERATIONS


def check_password(user: dict, password: str) -> bool:
    return verify_password(password, user.get("password_hash", ""), user.get("salt", ""),
                           user.get("iterations", auth.LEGACY_ITERATIONS))


def upgrade_password_hash(user_id: str, password: str) -> None:
    """Re-hash with the current iteration count; only possible right after a successful login."""
    with db_lock:
        users = load_users()
        set_password(find_user(users, user_id), password)
        save_users(users)


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
            admin = {
                "id": "admin_1",
                "username": "admin",
                "role": ADMIN,
                "name": "Administrator",
                "mitarbeiter_id": "admin_1",
            }
            set_password(admin, DEFAULT_ADMIN_PASSWORD)
            users.append(admin)
            changed = True

        # Also catches existing installations that never changed the default password.
        for u in users:
            if (u.get("username") == "admin" and not u.get("must_change_password")
                    and check_password(u, DEFAULT_ADMIN_PASSWORD)):
                u["must_change_password"] = True
                changed = True

        if changed:
            save_users(users)
