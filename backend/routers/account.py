"""Self-service account actions for any logged-in user."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth import get_session_user, is_admin, revoke_user_sessions, clear_must_change
from core.database import db_lock
from core.password_policy import enforce_password_policy
from core.security_settings import get_security_settings
from core.user_store import load_users, save_users, find_user, set_password, check_password

router = APIRouter(prefix="/api/account", tags=["account"])


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
def change_password(body: PasswordChange, user: dict = Depends(get_session_user)):
    # A pending forced change must always be possible, or the user could never get past the lock.
    if (not is_admin(user) and not user.get("must_change_password")
            and not get_security_settings()["allow_self_password_change"]):
        raise HTTPException(status_code=403, detail="Passwortänderung wurde vom Administrator deaktiviert")

    with db_lock:
        users = load_users()
        record = find_user(users, user["id"])
        if not check_password(record, body.current_password):
            raise HTTPException(status_code=400, detail="Aktuelles Passwort ist falsch")
        if body.new_password == body.current_password:
            raise HTTPException(status_code=400, detail="Neues Passwort muss sich vom aktuellen unterscheiden")
        enforce_password_policy(body.new_password)

        set_password(record, body.new_password)
        record.pop("must_change_password", None)
        save_users(users)
    clear_must_change(record["id"])
    revoke_user_sessions(record["id"], except_token=user.get("token"))
    return {"status": "ok"}
