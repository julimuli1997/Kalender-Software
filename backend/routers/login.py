"""Login, logout and 'who am I'."""
from fastapi import APIRouter, HTTPException, Depends
from core.auth import (
    verify_password,
    create_session,
    remove_session,
    get_session_user,
)
from core.login_guard import check_not_locked, register_failure, register_success
from core.models import UserLogin, UserResponse, TokenResponse
from core.user_store import load_users

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin):
    check_not_locked(credentials.username)
    user = next((u for u in load_users() if u.get("username", "").lower() == credentials.username.lower()), None)
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
