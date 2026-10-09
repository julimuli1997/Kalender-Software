from pydantic import BaseModel, Field, model_validator
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
    # All employees on the appointment. `mitarbeiter_id` stays the responsible one (it decides who
    # may edit) and is always part of this list; appointments saved before this field existed
    # simply have only that one.
    mitarbeiter_ids: list[str] = Field(default_factory=list)
    kunde: Optional[str] = ""
    ort: Optional[str] = ""
    telefon: Optional[str] = ""
    status: Optional[str] = "geplant"

    @model_validator(mode="after")
    def _normalize_assignment(self):
        ids = list(dict.fromkeys(str(i) for i in self.mitarbeiter_ids if i not in (None, "")))
        if self.mitarbeiter_id not in (None, ""):
            self.mitarbeiter_id = str(self.mitarbeiter_id)
            if self.mitarbeiter_id not in ids:
                ids.insert(0, self.mitarbeiter_id)
        elif ids:
            self.mitarbeiter_id = ids[0]
        self.mitarbeiter_ids = ids
        return self
