from fastapi import APIRouter, HTTPException, Depends
from core.auth import get_current_user, require_calendar_view, ensure_can_edit
from core.database import db_lock, read_list, write_json
from core.models import Termin
from core.paths import TERMINE_FILE
from core.websocket import manager

router = APIRouter(prefix="/api/termine", tags=["termine"])


def _index_of(data: list, t_id: str) -> int:
    index = next((i for i, item in enumerate(data) if str(item.get("id")) == t_id), None)
    if index is None:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    return index


@router.get("")
def get_termine(_viewer=Depends(require_calendar_view)):
    return read_list(TERMINE_FILE)


@router.post("")
async def create_termin(t: Termin, user: dict = Depends(get_current_user)):
    ensure_can_edit(user, t.mitarbeiter_id, "erstellen")
    with db_lock:
        data = read_list(TERMINE_FILE)
        data.append(t.model_dump())
        write_json(TERMINE_FILE, data)
    await manager.broadcast("update")
    return t


@router.put("/{t_id}")
async def update_termin(t_id: str, t: Termin, user: dict = Depends(get_current_user)):
    with db_lock:
        data = read_list(TERMINE_FILE)
        index = _index_of(data, t_id)
        ensure_can_edit(user, data[index].get("mitarbeiter_id"), "bearbeiten")  # current owner
        ensure_can_edit(user, t.mitarbeiter_id, "bearbeiten")                   # new owner
        data[index] = t.model_dump()
        write_json(TERMINE_FILE, data)
    await manager.broadcast("update")
    return t


@router.delete("/{t_id}")
async def delete_termin(t_id: str, user: dict = Depends(get_current_user)):
    with db_lock:
        data = read_list(TERMINE_FILE)
        index = _index_of(data, t_id)
        ensure_can_edit(user, data[index].get("mitarbeiter_id"), "löschen")
        del data[index]
        write_json(TERMINE_FILE, data)
    await manager.broadcast("update")
    return {"status": "ok"}
