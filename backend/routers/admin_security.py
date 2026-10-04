"""Admin-only: authentication/authorisation settings and account lockouts."""
from fastapi import APIRouter, Depends, HTTPException

from core.auth import require_admin
from core.login_guard import locked_usernames, unlock
from core.security_settings import (
    DEFAULTS, get_security_settings, save_security_settings,
)

router = APIRouter(prefix="/api/admin/security", tags=["admin-security"])


@router.get("")
def read_settings(admin: dict = Depends(require_admin)):
    return {"settings": get_security_settings(), "defaults": DEFAULTS}


@router.put("")
def write_settings(data: dict, admin: dict = Depends(require_admin)):
    try:
        return {"settings": save_security_settings(data), "defaults": DEFAULTS}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/locked")
def list_locked(admin: dict = Depends(require_admin)):
    return locked_usernames()


@router.post("/unlock/{username}")
def unlock_user(username: str, admin: dict = Depends(require_admin)):
    unlock(username)
    return {"status": "ok"}
