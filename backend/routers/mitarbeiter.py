from fastapi import APIRouter, Depends
from core.auth import require_calendar_view
from core.database import read_list
from core.paths import MITARBEITER_FILE

router = APIRouter(prefix="/api/mitarbeiter", tags=["mitarbeiter"])

@router.get("")
def get_mitarbeiter(_viewer=Depends(require_calendar_view)):
    return read_list(MITARBEITER_FILE)

# Employees are managed exclusively through registered users (see routers/users.py).
