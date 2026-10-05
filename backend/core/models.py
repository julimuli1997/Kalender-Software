from pydantic import BaseModel
from typing import Optional
from core.roles import Role, EMPLOYEE

class NameModel(BaseModel):
    id: str
    name: str

class UserCreate(BaseModel):
    username: str
    password: str
    role: Role = EMPLOYEE
    name: str  # Display name / Mitarbeiter Name

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    name: str
    mitarbeiter_id: Optional[str] = None
    must_change_password: bool = False

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class Termin(BaseModel):
    id: str
    title: str
    start: str
    end: Optional[str] = None
    allDay: Optional[bool] = False
    mitarbeiter_id: Optional[str] = None
    auto_id: Optional[str] = None
    beschreibung: Optional[str] = ""
