import json
import os
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

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
        return {"visibleDays": "1"} 
    return settings

@app.post("/api/settings")
async def update_settings(settings: dict):
    write_json("settings.json", settings)
    await manager.broadcast("update") # TV sofort informieren
    return settings