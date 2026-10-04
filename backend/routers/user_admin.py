"""Admin-only user management: edit profile/role and reset passwords."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from core.auth import hash_password, require_admin, revoke_user_sessions
from core.database import read_json, write_json
from core.password_policy import enforce_password_policy
from core.user_store import load_users, save_users, find_user, public_user, admin_count
from core.websocket import manager

router = APIRouter(prefix="/api/users", tags=["user-admin"])
MITARBEITER_FILE = "mitarbeiter.json"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None  # "admin" | "mitarbeiter"


class PasswordReset(BaseModel):
    new_password: str


@router.put("/{user_id}")
async def update_user(user_id: str, body: UserUpdate, admin: dict = Depends(require_admin)):
    users = load_users()
    user = find_user(users, user_id)

    if body.role is not None:
        if body.role not in ("admin", "mitarbeiter"):
            raise HTTPException(status_code=400, detail="Ungültige Rolle")
        if body.role != user.get("role"):
            if str(user["id"]) == str(admin["id"]):
                raise HTTPException(status_code=400, detail="Eigene Rolle kann nicht geändert werden")
            if user.get("role") == "admin" and admin_count(users) <= 1:
                raise HTTPException(status_code=400, detail="Der letzte Admin kann nicht herabgestuft werden")
            user["role"] = body.role
            revoke_user_sessions(user["id"])  # force re-login with the new role

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name darf nicht leer sein")
        user["name"] = name
        m_list = read_json(MITARBEITER_FILE)
        if isinstance(m_list, list):
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
    users = load_users()
    user = find_user(users, user_id)
    user["password_hash"], user["salt"] = hash_password(body.new_password)
    save_users(users)
    # Own session survives; every other session of that user is ended.
    revoke_user_sessions(user["id"], except_token=admin.get("token") if str(user["id"]) == str(admin["id"]) else None)
    return {"status": "ok"}
