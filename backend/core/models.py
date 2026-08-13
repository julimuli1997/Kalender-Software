from pydantic import BaseModel
from typing import Optional

class NameModel(BaseModel):
    id: str
    name: str

class Termin(BaseModel):
    id: str
    title: str
    start: str
    end: Optional[str] = None
    allDay: Optional[bool] = False
    mitarbeiter_id: Optional[str] = None
    auto_id: Optional[str] = None
    beschreibung: Optional[str] = ""
