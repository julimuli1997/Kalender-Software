"""Admin-only user management: list, create, edit, delete and reset passwords."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth import hash_password, require_admin, revoke_user_sessions
from core.database import db_lock, read_list, write_json
from core.models import UserCreate
from core.password_policy import enforce_password_policy
from core.paths import MITARBEITER_FILE, TERMINE_FILE
from core.roles import ADMIN, Role
from core.user_store import load_users, save_users, find_user, public_user, admin_count
from core.websocket import manager

router = APIRouter(prefix="/api/users", tags=["users"])


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Role] = None


class PasswordReset(BaseModel):
    new_password: str


@router.get("")
def get_users(admin: dict = Depends(require_admin)):
    return [public_user(u) for u in load_users()]


@router.post("")
async def create_user(u: UserCreate, admin: dict = Depends(require_admin)):
    enforce_password_policy(u.password)
    hashed, salt = hash_password(u.password)
    user_id = uuid.uuid4().hex

    with db_lock:
        users = load_users()
        if any(x.get("username", "").lower() == u.username.lower() for x in users):
            raise HTTPException(status_code=400, detail="Benutzername existiert bereits")

        new_user = {
            "id": user_id,
            "username": u.username,
            "password_hash": hashed,
            "salt": salt,
            "role": u.role,
            "name": u.name,
            "mitarbeiter_id": user_id,
        }
        users.append(new_user)
        save_users(users)

        # Sync with mitarbeiter.json so calendar/employee routes match automatically
        mitarbeiter_list = read_list(MITARBEITER_FILE)
        mitarbeiter_list.append({"id": user_id, "name": u.name})
        write_json(MITARBEITER_FILE, mitarbeiter_list)

    await manager.broadcast("update")
    return public_user(new_user)


@router.put("/{user_id}")
async def update_user(user_id: str, body: UserUpdate, admin: dict = Depends(require_admin)):
    with db_lock:
        users = load_users()
        user = find_user(users, user_id)

        if body.role is not None and body.role != user.get("role"):
            if str(user["id"]) == str(admin["id"]):
                raise HTTPException(status_code=400, detail="Eigene Rolle kann nicht geändert werden")
            if user.get("role") == ADMIN and admin_count(users) <= 1:
                raise HTTPException(status_code=400, detail="Der letzte Admin kann nicht herabgestuft werden")
            user["role"] = body.role
            revoke_user_sessions(user["id"])  # force re-login with the new role

        if body.name is not None:
            name = body.name.strip()
            if not name:
                raise HTTPException(status_code=400, detail="Name darf nicht leer sein")
            user["name"] = name
            m_list = read_list(MITARBEITER_FILE)
            for m in m_list:
                if str(m.get("id")) == str(user.get("mitarbeiter_id")):
                    m["name"] = name
            write_json(MITARBEITER_FILE, m_list)

        save_users(users)
    await manager.broadcast("update")
    return public_user(user)


@router.post("/{user_id}/reset-password")
def reset_password(user_id: str, body: PasswordReset, admin: dict = Depends(require_admin)):
    enforce_password_policy(body.new_password)
    with db_lock:
        users = load_users()
        user = find_user(users, user_id)
        user["password_hash"], user["salt"] = hash_password(body.new_password)
        save_users(users)
    # Own session survives; every other session of that user is ended.
    revoke_user_sessions(user["id"], except_token=admin.get("token") if str(user["id"]) == str(admin["id"]) else None)
    return {"status": "ok"}


@router.delete("/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    with db_lock:
        users = load_users()
        user_to_del = find_user(users, user_id)

        if user_to_del.get("username") == "admin":
            raise HTTPException(status_code=400, detail="Haupt-Admin kann nicht gelöscht werden")
        if user_id == str(admin.get("id")):
            raise HTTPException(status_code=400, detail="Eigenes Konto kann nicht gelöscht werden")

        save_users([x for x in users if str(x.get("id")) != user_id])
        revoke_user_sessions(user_id)

        # Also clean up the employee entry and the appointments that would be orphaned
        m_id = str(user_to_del.get("mitarbeiter_id") or user_id)
        write_json(MITARBEITER_FILE, [m for m in read_list(MITARBEITER_FILE) if str(m.get("id")) != m_id])
        write_json(TERMINE_FILE, [t for t in read_list(TERMINE_FILE) if str(t.get("mitarbeiter_id")) != m_id])

    await manager.broadcast("update")
    return {"status": "ok"}
