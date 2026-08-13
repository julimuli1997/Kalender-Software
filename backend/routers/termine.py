from fastapi import APIRouter
from core.database import read_json, write_json
from core.models import Termin
from core.websocket import manager

router = APIRouter(prefix="/api/termine", tags=["termine"])

FILE_PATH = "db.json"

@router.get("")
def get_termine():
    return read_json(FILE_PATH)

@router.post("")
async def create_termin(t: Termin):
    data = read_json(FILE_PATH)
    data.append(t.dict())
    write_json(FILE_PATH, data)
    await manager.broadcast("update")
    return t

@router.delete("/{t_id}")
async def delete_termin(t_id: str):
    data = read_json(FILE_PATH)
    write_json(FILE_PATH, [x for x in data if str(x.get("id")) != t_id])
    await manager.broadcast("update")
    return {"status": "ok"}

@router.put("/{t_id}")
async def update_termin(t_id: str, t: Termin):
    data = read_json(FILE_PATH)
    for i, item in enumerate(data):
        if str(item.get("id")) == t_id:
            data[i] = t.dict()
            break
    write_json(FILE_PATH, data)
    await manager.broadcast("update")
    return t
