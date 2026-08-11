import json
import os
import socket
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

# CORS muss alles erlauben, damit React mit FastAPI reden darf
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WEBSOCKET FÜR LIVE-UPDATES ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try: await connection.send_text(message)
            except: pass

manager = ConnectionManager()

# --- HELFER FUNKTIONEN ---
def read_json(filename):
    if not os.path.exists(filename): return []
    with open(filename, "r", encoding="utf-8") as f:
        try: return json.load(f)
        except: return []

def write_json(filename, data):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# --- MODELLE ---
class NameModel(BaseModel):
    id: str
    name: str

class Termin(BaseModel):
    id: str
    title: str
    start: str
    end: Optional[str] = None
    allDay: Optional[bool] = False
    mitarbeiter_id: Optional[str] = None
    auto_id: Optional[str] = None
    beschreibung: Optional[str] = ""  # <--- NEU: Backend akzeptiert jetzt die Beschreibung

# --- WEBSOCKET ENDPUNKT ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- ROUTEN FÜR MITARBEITER ---
@app.get("/api/mitarbeiter")
def get_m(): return read_json("mitarbeiter.json")

@app.post("/api/mitarbeiter")
async def add_m(m: NameModel):
    data = read_json("mitarbeiter.json")
    data.append(m.dict())
    write_json("mitarbeiter.json", data)
    await manager.broadcast("update")
    return m

@app.delete("/api/mitarbeiter/{m_id}")
async def del_m(m_id: str):
    data = read_json("mitarbeiter.json")
    write_json("mitarbeiter.json", [x for x in data if x["id"] != m_id])
    await manager.broadcast("update")
    return {"status": "ok"}

# --- ROUTEN FÜR AUTOS ---
@app.get("/api/autos")
def get_a(): return read_json("autos.json")

@app.post("/api/autos")
async def add_a(a: NameModel):
    data = read_json("autos.json")
    data.append(a.dict())
    write_json("autos.json", data)
    await manager.broadcast("update")
    return a

@app.delete("/api/autos/{a_id}")
async def del_a(a_id: str):
    data = read_json("autos.json")
    write_json("autos.json", [x for x in data if x["id"] != a_id])
    await manager.broadcast("update")
    return {"status": "ok"}

# --- ROUTEN FÜR TERMINE ---
@app.get("/api/termine")
def get_t(): return read_json("db.json")

@app.post("/api/termine")
async def create_t(t: Termin):
    data = read_json("db.json")
    data.append(t.dict())
    write_json("db.json", data)
    await manager.broadcast("update")
    return t

@app.delete("/api/termine/{t_id}")
async def del_t(t_id: str):
    data = read_json("db.json")
    write_json("db.json", [x for x in data if str(x.get("id")) != t_id])
    await manager.broadcast("update")
    return {"status": "ok"}

@app.put("/api/termine/{t_id}")
async def update_t(t_id: str, t: Termin):
    data = read_json("db.json")
    for i, item in enumerate(data):
        if str(item.get("id")) == t_id:
            data[i] = t.dict()
            break
    write_json("db.json", data)
    await manager.broadcast("update")
    return t

# --- SETTINGS ROUTE ---
@app.get("/api/settings")
def get_settings():
    settings = read_json("settings.json")
    # Standardwert, falls Datei leer oder neu
    if not settings:
        return {"visibleDays": "1", "theme": "light"} 
    return settings

# Wurde repariert: Vorher gab es diese Route doppelt
@app.post("/api/settings")
async def update_settings(settings: dict):
    # Lade aktuelle Settings, falls vorhanden
    if isinstance(read_json("settings.json"), dict):
        current = read_json("settings.json")
    else:
        current = {}
        
    current.update(settings) # Merged neue Einstellungen (Tage & Theme)
    write_json("settings.json", current)
    await manager.broadcast("update")
    return current

# --- NETWORK INFO ROUTE ---
@app.get("/api/network-info")
def get_network_info():
    ips = []
    try:
        # Get all IPs for the hostname
        hostname = socket.gethostname()
        addr_info = socket.getaddrinfo(hostname, None)
        for info in addr_info:
            ip = info[4][0]
            # Only include IPv4, skip loopback
            if ":" not in ip and not ip.startswith("127."):
                if ip not in ips:
                    ips.append(ip)
    except Exception:
        pass
    # Fallback: try connecting to an external address
    if not ips:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ips.append(s.getsockname()[0])
            s.close()
        except Exception:
            pass
    settings = read_json("settings.json")
    network_mode = settings.get("networkMode", "localhost") if isinstance(settings, dict) else "localhost"
    return {"ips": ips, "networkMode": network_mode}

# --- REACT FRONTEND SERVIEREN ---
app.mount("/", StaticFiles(directory="dist", html=True), name="static")

@app.exception_handler(404)
async def custom_404_handler(request, exc):
    return FileResponse('dist/index.html')

# --- SERVER START FÜR PYINSTALLER ---
import uvicorn
import multiprocessing
import traceback
import sys
import os
import webbrowser
import threading

def open_browser():
    webbrowser.open("http://localhost:8000")

if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    # --- DER NOCONSOLE FIX ---
    # Wenn Windows das Terminal versteckt, geben wir Python "blinde" Ausgänge, 
    # damit Uvicorn nicht beim Versuch zu drucken abstürzt.
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w")
    if sys.stdin is None:
        sys.stdin = open(os.devnull, "r")
        
    try:
        threading.Timer(1.5, open_browser).start()
        uvicorn.run(app, host="0.0.0.0", port=8000)
        
    except Exception as e:
        with open("crash_log.txt", "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())
        # Wir lassen das input() hier absichtlich weg, da wir eh kein Terminal mehr haben!