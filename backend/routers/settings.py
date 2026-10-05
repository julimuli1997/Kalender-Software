import socket
from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from core.auth import get_current_user, require_calendar_view
from core.database import read_json, write_json, db_lock
from core.websocket import manager

router = APIRouter(prefix="/api", tags=["settings"])

FILE_PATH = "settings.json"


class SettingsUpdate(BaseModel):
    """Only these keys can be stored; anything else is rejected with 422."""
    model_config = ConfigDict(extra="forbid")
    theme: Optional[Literal["light", "dark"]] = None
    visibleDays: Optional[Literal["1", "2", "3", "4", "5", "6", "7"]] = None
    networkMode: Optional[Literal["localhost", "network"]] = None

@router.get("/settings")
def get_settings(_viewer=Depends(require_calendar_view)):
    settings = read_json(FILE_PATH)
    if not settings or not isinstance(settings, dict):
        return {"visibleDays": "1", "theme": "light"}
    return settings

@router.post("/settings")
async def update_settings(settings: SettingsUpdate, user: dict = Depends(get_current_user)):
    changes = settings.model_dump(exclude_none=True)
    # networkMode decides who may reach the admin page at all -> admins only
    if "networkMode" in changes and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Nur für Administratoren gestattet")
    with db_lock:
        current = read_json(FILE_PATH)
        if not isinstance(current, dict):
            current = {}
        current.update(changes)
        write_json(FILE_PATH, current)
    await manager.broadcast("update")
    return current

@router.get("/network-info")
def get_network_info(_user: dict = Depends(get_current_user)):
    ips = []
    try:
        hostname = socket.gethostname()
        addr_info = socket.getaddrinfo(hostname, None)
        for info in addr_info:
            ip = info[4][0]
            if ":" not in ip and not ip.startswith("127."):
                if ip not in ips:
                    ips.append(ip)
    except Exception:
        pass

    if not ips:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ips.append(s.getsockname()[0])
            s.close()
        except Exception:
            pass

    settings = read_json(FILE_PATH)
    network_mode = settings.get("networkMode", "localhost") if isinstance(settings, dict) else "localhost"
    return {"ips": ips, "networkMode": network_mode}
