from fastapi import APIRouter, Depends
from core.auth import require_calendar_view
from core.database import read_json

router = APIRouter(prefix="/api/mitarbeiter", tags=["mitarbeiter"])

FILE_PATH = "mitarbeiter.json"

@router.get("")
def get_mitarbeiter(_viewer=Depends(require_calendar_view)):
    return read_json(FILE_PATH)

# Employees are managed exclusively through registered users (see routers/users.py).
