from fastapi import APIRouter
from core.database import read_json, write_json
from core.models import NameModel
from core.websocket import manager

router = APIRouter(prefix="/api/mitarbeiter", tags=["mitarbeiter"])

FILE_PATH = "mitarbeiter.json"

@router.get("")
def get_mitarbeiter():
    return read_json(FILE_PATH)

@router.post("")
async def add_mitarbeiter(m: NameModel):
    data = read_json(FILE_PATH)
    data.append(m.dict())
    write_json(FILE_PATH, data)
    await manager.broadcast("update")
    return m

@router.delete("/{m_id}")
async def delete_mitarbeiter(m_id: str):
    data = read_json(FILE_PATH)
    write_json(FILE_PATH, [x for x in data if x.get("id") != m_id])
    await manager.broadcast("update")
    return {"status": "ok"}
