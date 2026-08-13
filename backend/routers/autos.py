from fastapi import APIRouter
from core.database import read_json, write_json
from core.models import NameModel
from core.websocket import manager

router = APIRouter(prefix="/api/autos", tags=["autos"])

FILE_PATH = "autos.json"

@router.get("")
def get_autos():
    return read_json(FILE_PATH)

@router.post("")
async def add_auto(a: NameModel):
    data = read_json(FILE_PATH)
    data.append(a.dict())
    write_json(FILE_PATH, data)
    await manager.broadcast("update")
    return a

@router.delete("/{a_id}")
async def delete_auto(a_id: str):
    data = read_json(FILE_PATH)
    write_json(FILE_PATH, [x for x in data if x.get("id") != a_id])
    await manager.broadcast("update")
    return {"status": "ok"}
