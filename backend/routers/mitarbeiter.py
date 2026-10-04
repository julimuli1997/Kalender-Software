from fastapi import APIRouter
from core.database import read_json

router = APIRouter(prefix="/api/mitarbeiter", tags=["mitarbeiter"])

FILE_PATH = "mitarbeiter.json"

@router.get("")
def get_mitarbeiter():
    return read_json(FILE_PATH)

# Employees are managed exclusively through registered users (see routers/users.py).
