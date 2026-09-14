import time
from fastapi import APIRouter, HTTPException, Depends
from core.database import read_json, write_json
from core.models import UserCreate, UserLogin, UserResponse, TokenResponse
from core.auth import (
    hash_password,
    verify_password,
    create_session,
    remove_session,
    get_current_user,
    require_admin,
    USERS_FILE
)
from core.websocket import manager

router = APIRouter(prefix="/api", tags=["users"])
MITARBEITER_FILE = "mitarbeiter.json"

def ensure_default_admin():
    users = read_json(USERS_FILE)
    if not isinstance(users, list):
        users = []
    
    admin_exists = any(u.get("role") == "admin" for u in users)
    if not admin_exists:
        hashed, salt = hash_password("admin123")
        admin_user = {
            "id": "admin_1",
            "username": "admin",
            "password_hash": hashed,
            "salt": salt,
            "role": "admin",
            "name": "Administrator",
            "mitarbeiter_id": "admin_1"
        }
        users.append(admin_user)
        write_json(USERS_FILE, users)

@router.post("/auth/login", response_model=TokenResponse)
def login(credentials: UserLogin):
    users = read_json(USERS_FILE)
    if not isinstance(users, list):
        users = []
    
    user = next((u for u in users if u.get("username", "").lower() == credentials.username.lower()), None)
    if not user or not verify_password(credentials.password, user.get("password_hash", ""), user.get("salt", "")):
        raise HTTPException(status_code=400, detail="Ungültiger Benutzername oder Passwort")
    
    token = create_session(user)
    user_res = UserResponse(
        id=user.get("id"),
        username=user.get("username"),
        role=user.get("role", "mitarbeiter"),
        name=user.get("name"),
        mitarbeiter_id=user.get("mitarbeiter_id", user.get("id"))
    )
    return TokenResponse(token=token, user=user_res)

@router.post("/auth/logout")
def logout(user: dict = Depends(get_current_user)):
    # Handled by frontend clearing header/token or backend session cleanup
    return {"status": "ok"}

@router.get("/auth/me", response_model=UserResponse)
def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user.get("id"),
        username=user.get("username"),
        role=user.get("role"),
        name=user.get("name"),
        mitarbeiter_id=user.get("mitarbeiter_id")
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
    users = read_json(USERS_FILE)
    if not isinstance(users, list):
        users = []
    
    if any(x.get("username", "").lower() == u.username.lower() for x in users):
        raise HTTPException(status_code=400, detail="Benutzername existiert bereits")

    hashed, salt = hash_password(u.password)
    user_id = str(int(time.time() * 1000))
    mitarbeiter_id = user_id

    new_user = {
        "id": user_id,
        "username": u.username,
        "password_hash": hashed,
        "salt": salt,
        "role": u.role,
        "name": u.name,
        "mitarbeiter_id": mitarbeiter_id
    }
    users.append(new_user)
    write_json(USERS_FILE, users)

    # Sync with mitarbeiter.json so calendar/employee routes match automatically
    mitarbeiter_list = read_json(MITARBEITER_FILE)
    if not isinstance(mitarbeiter_list, list):
        mitarbeiter_list = []
    mitarbeiter_list.append({"id": mitarbeiter_id, "name": u.name})
    write_json(MITARBEITER_FILE, mitarbeiter_list)

    await manager.broadcast("update")
    return {
        "id": user_id,
        "username": u.username,
        "role": u.role,
        "name": u.name,
        "mitarbeiter_id": mitarbeiter_id
    }

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    users = read_json(USERS_FILE)
    if not isinstance(users, list):
        users = []
    
    user_to_del = next((x for x in users if str(x.get("id")) == user_id), None)
    if not user_to_del:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    
    if user_to_del.get("username") == "admin":
        raise HTTPException(status_code=400, detail="Haupt-Admin kann nicht gelöscht werden")

    write_json(USERS_FILE, [x for x in users if str(x.get("id")) != user_id])

    # Also clean up mitarbeiter list entry if matched
    m_id = user_to_del.get("mitarbeiter_id") or user_id
    mitarbeiter_list = read_json(MITARBEITER_FILE)
    if isinstance(mitarbeiter_list, list):
        write_json(MITARBEITER_FILE, [m for m in mitarbeiter_list if str(m.get("id")) != str(m_id)])

    await manager.broadcast("update")
    return {"status": "ok"}
