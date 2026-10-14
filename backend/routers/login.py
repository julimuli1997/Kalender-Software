"""Login, logout and 'who am I'."""
from fastapi import APIRouter, HTTPException, Depends, Request
from core import auth
from core.auth import (
    create_session,
    remove_session,
    get_session_user,
)
from core.login_guard import check_not_locked, register_failure, register_success
from core.models import UserLogin, UserResponse, TokenResponse
from core.user_store import load_users, check_password, upgrade_password_hash

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, request: Request):
    ip = request.client.host if request.client else ""
    check_not_locked(credentials.username, ip)
    user = next((u for u in load_users() if u.get("username", "").lower() == credentials.username.lower()), None)
    if not user or not check_password(user, credentials.password):
        register_failure(credentials.username, ip)
        raise HTTPException(status_code=400, detail="Ungültiger Benutzername oder Passwort")
    register_success(credentials.username, ip)
    if user.get("iterations") != auth.PBKDF2_ITERATIONS:
        upgrade_password_hash(user["id"], credentials.password)

    token = create_session(user)
    user_res = UserResponse(
        id=user.get("id"),
        username=user.get("username"),
        role=user.get("role", "mitarbeiter"),
        name=user.get("name"),
        mitarbeiter_id=user.get("mitarbeiter_id", user.get("id")),
        must_change_password=bool(user.get("must_change_password")),
    )
    return TokenResponse(token=token, user=user_res)


@router.post("/logout")
def logout(user: dict = Depends(get_session_user)):
    remove_session(user.get("token"))
    return {"status": "ok"}


@router.get("/me", response_model=UserResponse)
def get_me(user: dict = Depends(get_session_user)):
    return UserResponse(
        id=user.get("id"),
        username=user.get("username"),
        role=user.get("role"),
        name=user.get("name"),
        mitarbeiter_id=user.get("mitarbeiter_id"),
        must_change_password=bool(user.get("must_change_password")),
    )
