import socket
from fastapi import APIRouter
from core.database import read_json, write_json
from core.websocket import manager

router = APIRouter(prefix="/api", tags=["settings"])

FILE_PATH = "settings.json"

@router.get("/settings")
def get_settings():
    settings = read_json(FILE_PATH)
    if not settings or not isinstance(settings, dict):
        return {"visibleDays": "1", "theme": "light"}
    return settings

@router.post("/settings")
async def update_settings(settings: dict):
    current = read_json(FILE_PATH)
    if not isinstance(current, dict):
        current = {}
    current.update(settings)
    write_json(FILE_PATH, current)
    await manager.broadcast("update")
    return current

@router.get("/network-info")
def get_network_info():
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
