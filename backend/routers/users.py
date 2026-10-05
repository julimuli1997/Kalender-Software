import uuid
from fastapi import APIRouter, HTTPException, Depends
from core.database import read_json, write_json
from core.models import UserCreate, UserLogin, UserResponse, TokenResponse
from core.database import db_lock
from core.auth import (
    hash_password,
    verify_password,
    create_session,
    remove_session,
    get_current_user,
    get_session_user,
    require_admin,
    revoke_user_sessions,
    USERS_FILE
)
from core.login_guard import check_not_locked, register_failure, register_success
from core.password_policy import enforce_password_policy
TERMINE_FILE = "db.json"
from core.websocket import manager

router = APIRouter(prefix="/api", tags=["users"])
MITARBEITER_FILE = "mitarbeiter.json"

DEFAULT_ADMIN_PASSWORD = "admin123"

def ensure_default_admin():
    """Create the initial admin if none exists and force a password change while it still has the default."""
    with db_lock:
        users = read_json(USERS_FILE)
        if not isinstance(users, list):
            users = []

        changed = False
        if not any(u.get("role") == "admin" for u in users):
            hashed, salt = hash_password(DEFAULT_ADMIN_PASSWORD)
            users.append({
                "id": "admin_1",
                "username": "admin",
                "password_hash": hashed,
                "salt": salt,
                "role": "admin",
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
            write_json(USERS_FILE, users)

@router.post("/auth/login", response_model=TokenResponse)
def login(credentials: UserLogin):
    users = read_json(USERS_FILE)
    if not isinstance(users, list):
        users = []
    
    check_not_locked(credentials.username)
    user = next((u for u in users if u.get("username", "").lower() == credentials.username.lower()), None)
    if not user or not verify_password(credentials.password, user.get("password_hash", ""), user.get("salt", "")):
        register_failure(credentials.username)
        raise HTTPException(status_code=400, detail="Ungültiger Benutzername oder Passwort")
    register_success(credentials.username)
    
    token = create_session(user)
    user_res = UserResponse(
        id=user.get("id"),
        username=user.get("username"),
        role=user.get("role", "mitarbeiter"),
        name=user.get("name"),
        mitarbeiter_id=user.get("mitarbeiter_id", user.get("id")),
        must_change_password=bool(user.get("must_change_password"))
    )
    return TokenResponse(token=token, user=user_res)

@router.post("/auth/logout")
def logout(user: dict = Depends(get_session_user)):
    remove_session(user.get("token"))
    return {"status": "ok"}

@router.get("/auth/me", response_model=UserResponse)
def get_me(user: dict = Depends(get_session_user)):
    return UserResponse(
        id=user.get("id"),
        username=user.get("username"),
        role=user.get("role"),
        name=user.get("name"),
        mitarbeiter_id=user.get("mitarbeiter_id"),
        must_change_password=bool(user.get("must_change_password"))
    )

@router.get("/users")
def get_users(admin: dict = Depends(require_admin)):
    users = read_json(USERS_FILE)
    if not isinstance(users, list):
        return []
    return [
        {
            "id": u.get("id"),
            "username": u.get("username"),
            "role": u.get("role"),
            "name": u.get("name"),
            "mitarbeiter_id": u.get("mitarbeiter_id")
        }
        for u in users
    ]

@router.post("/users")
async def create_user(u: UserCreate, admin: dict = Depends(require_admin)):
    if u.role not in ("admin", "mitarbeiter"):
        raise HTTPException(status_code=400, detail="Ungültige Rolle")
    enforce_password_policy(u.password)
    hashed, salt = hash_password(u.password)
    user_id = uuid.uuid4().hex

    with db_lock:
        users = read_json(USERS_FILE)
        if not isinstance(users, list):
            users = []
        if any(x.get("username", "").lower() == u.username.lower() for x in users):
            raise HTTPException(status_code=400, detail="Benutzername existiert bereits")

        users.append({
            "id": user_id,
            "username": u.username,
            "password_hash": hashed,
            "salt": salt,
            "role": u.role,
            "name": u.name,
            "mitarbeiter_id": user_id
        })
        write_json(USERS_FILE, users)

        # Sync with mitarbeiter.json so calendar/employee routes match automatically
        mitarbeiter_list = read_json(MITARBEITER_FILE)
        if not isinstance(mitarbeiter_list, list):
            mitarbeiter_list = []
        mitarbeiter_list.append({"id": user_id, "name": u.name})
        write_json(MITARBEITER_FILE, mitarbeiter_list)

    await manager.broadcast("update")
    return {
        "id": user_id,
        "username": u.username,
        "role": u.role,
        "name": u.name,
        "mitarbeiter_id": user_id
    }

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    with db_lock:
        users = read_json(USERS_FILE)
        if not isinstance(users, list):
            users = []

        user_to_del = next((x for x in users if str(x.get("id")) == user_id), None)
        if not user_to_del:
            raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")

        if user_to_del.get("username") == "admin":
            raise HTTPException(status_code=400, detail="Haupt-Admin kann nicht gelöscht werden")

        if user_id == str(admin.get("id")):
            raise HTTPException(status_code=400, detail="Eigenes Konto kann nicht gelöscht werden")

        write_json(USERS_FILE, [x for x in users if str(x.get("id")) != user_id])
        revoke_user_sessions(user_id)

        # Also clean up mitarbeiter list entry if matched
        m_id = user_to_del.get("mitarbeiter_id") or user_id
        mitarbeiter_list = read_json(MITARBEITER_FILE)
        if isinstance(mitarbeiter_list, list):
            write_json(MITARBEITER_FILE, [m for m in mitarbeiter_list if str(m.get("id")) != str(m_id)])

        # Appointments of a deleted employee would be orphaned -> remove them too
        termine = read_json(TERMINE_FILE)
        if isinstance(termine, list):
            write_json(TERMINE_FILE, [t for t in termine if str(t.get("mitarbeiter_id")) != str(m_id)])

    await manager.broadcast("update")
    return {"status": "ok"}
