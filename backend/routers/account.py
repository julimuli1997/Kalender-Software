"""Self-service account actions for any logged-in user."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth import get_current_user, hash_password, verify_password, revoke_user_sessions
from core.password_policy import enforce_password_policy
from core.security_settings import get_security_settings
from core.user_store import load_users, save_users, find_user

router = APIRouter(prefix="/api/account", tags=["account"])


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(body: PasswordChange, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin" and not get_security_settings()["allow_self_password_change"]:
        raise HTTPException(status_code=403, detail="Passwortänderung wurde vom Administrator deaktiviert")

    users = load_users()
    record = find_user(users, user["id"])
    if not verify_password(body.current_password, record["password_hash"], record["salt"]):
        raise HTTPException(status_code=400, detail="Aktuelles Passwort ist falsch")
    enforce_password_policy(body.new_password)

    record["password_hash"], record["salt"] = hash_password(body.new_password)
    save_users(users)
    revoke_user_sessions(record["id"], except_token=user.get("token"))
    return {"status": "ok"}
