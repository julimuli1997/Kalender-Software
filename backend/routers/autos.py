from fastapi import APIRouter, Depends
from core.auth import require_admin, require_calendar_view
from core.database import read_json, write_json, db_lock
from core.models import NameModel
from core.websocket import manager

router = APIRouter(prefix="/api/autos", tags=["autos"])

FILE_PATH = "autos.json"

@router.get("")
def get_autos(_viewer=Depends(require_calendar_view)):
    return read_json(FILE_PATH)

@router.post("")
async def add_auto(a: NameModel, admin: dict = Depends(require_admin)):
    with db_lock:
        data = read_json(FILE_PATH)
        data.append(a.model_dump())
        write_json(FILE_PATH, data)
    await manager.broadcast("update")
    return a

@router.delete("/{a_id}")
async def delete_auto(a_id: str, admin: dict = Depends(require_admin)):
    with db_lock:
        data = read_json(FILE_PATH)
        write_json(FILE_PATH, [x for x in data if x.get("id") != a_id])
    await manager.broadcast("update")
    return {"status": "ok"}
