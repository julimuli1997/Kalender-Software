from fastapi import APIRouter, HTTPException, Depends
from core.database import read_json, write_json, db_lock
from core.models import Termin
from core.websocket import manager
from core.auth import get_current_user, require_calendar_view

router = APIRouter(prefix="/api/termine", tags=["termine"])

FILE_PATH = "db.json"

@router.get("")
def get_termine(_viewer=Depends(require_calendar_view)):
    return read_json(FILE_PATH)

@router.post("")
async def create_termin(t: Termin, user: dict = Depends(get_current_user)):
    # Check permissions
    if user.get("role") != "admin":
        user_m_id = str(user.get("mitarbeiter_id"))
        if str(t.mitarbeiter_id) != user_m_id:
            raise HTTPException(status_code=403, detail="Sie können nur eigene Termine erstellen.")

    with db_lock:
        data = read_json(FILE_PATH)
        data.append(t.model_dump())
        write_json(FILE_PATH, data)
    await manager.broadcast("update")
    return t

@router.delete("/{t_id}")
async def delete_termin(t_id: str, user: dict = Depends(get_current_user)):
    with db_lock:
        data = read_json(FILE_PATH)
        target = next((x for x in data if str(x.get("id")) == t_id), None)
        if not target:
            raise HTTPException(status_code=404, detail="Termin nicht gefunden")

        if user.get("role") != "admin":
            user_m_id = str(user.get("mitarbeiter_id"))
            if str(target.get("mitarbeiter_id")) != user_m_id:
                raise HTTPException(status_code=403, detail="Sie können nur eigene Termine löschen.")

        write_json(FILE_PATH, [x for x in data if str(x.get("id")) != t_id])
    await manager.broadcast("update")
    return {"status": "ok"}

@router.put("/{t_id}")
async def update_termin(t_id: str, t: Termin, user: dict = Depends(get_current_user)):
    with db_lock:
        data = read_json(FILE_PATH)
        index = next((i for i, item in enumerate(data) if str(item.get("id")) == t_id), None)
        if index is None:
            raise HTTPException(status_code=404, detail="Termin nicht gefunden")

        if user.get("role") != "admin":
            user_m_id = str(user.get("mitarbeiter_id"))
            if str(data[index].get("mitarbeiter_id")) != user_m_id or str(t.mitarbeiter_id) != user_m_id:
                raise HTTPException(status_code=403, detail="Sie können nur eigene Termine bearbeiten.")

        data[index] = t.model_dump()
        write_json(FILE_PATH, data)
    await manager.broadcast("update")
    return t
