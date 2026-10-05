from fastapi import APIRouter, Depends
from core.auth import require_admin, require_calendar_view
from core.database import db_lock, read_list, write_json
from core.models import NameModel
from core.paths import AUTOS_FILE
from core.websocket import manager

router = APIRouter(prefix="/api/autos", tags=["autos"])

@router.get("")
def get_autos(_viewer=Depends(require_calendar_view)):
    return read_list(AUTOS_FILE)

@router.post("")
async def add_auto(a: NameModel, admin: dict = Depends(require_admin)):
    with db_lock:
        data = read_list(AUTOS_FILE)
        data.append(a.model_dump())
        write_json(AUTOS_FILE, data)
    await manager.broadcast("update")
    return a

@router.delete("/{a_id}")
async def delete_auto(a_id: str, admin: dict = Depends(require_admin)):
    with db_lock:
        data = read_list(AUTOS_FILE)
        write_json(AUTOS_FILE, [x for x in data if x.get("id") != a_id])
    await manager.broadcast("update")
    return {"status": "ok"}
