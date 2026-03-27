import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI()

# CORS-Einstellungen (damit dein React-Frontend mit dem Backend reden darf)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In Produktion besser die genaue URL (z.B. http://localhost:5173) angeben
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "db.json"

# Hilfsfunktionen zum Lesen und Schreiben der JSON-Datei
def read_db():
    if not os.path.exists(DB_FILE):
        return []
    with open(DB_FILE, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def write_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# Pydantic Model für das Empfangen von Termin-Daten
class Termin(BaseModel):
    id: str
    title: str
    start: str
    end: Optional[str] = None
    allDay: Optional[bool] = False

# --- DEINE BESTEHENDEN ROUTEN (GET & POST) ---

@app.get("/api/termine")
def get_termine():
    return read_db()

@app.post("/api/termine")
def create_termin(termin: Termin):
    termine = read_db()
    termine.append(termin.dict())
    write_db(termine)
    return {"message": "Termin erfolgreich erstellt"}


# --- NEU: ROUTEN FÜR DELETE UND PUT ---

# 1. DELETE-Route (Zum Löschen eines Termins)
@app.delete("/api/termine/{termin_id}")
def delete_termin(termin_id: str):
    termine = read_db()
    
    # Filtere alle Termine heraus, die NICHT die gesuchte ID haben
    neue_termine = [t for t in termine if str(t.get("id")) != termin_id]
    
    # Wenn die Listen gleich lang sind, wurde nichts gefunden
    if len(termine) == len(neue_termine):
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
        
    write_db(neue_termine)
    return {"message": f"Termin mit ID {termin_id} gelöscht"}

# 2. PUT-Route (Zum Aktualisieren/Verschieben per Drag & Drop)
@app.put("/api/termine/{termin_id}")
def update_termin(termin_id: str, updated_termin: Termin):
    termine = read_db()
    termin_gefunden = False
    
    # Suche den Termin und ersetze seine Daten
    for i, t in enumerate(termine):
        if str(t.get("id")) == termin_id:
            termine[i] = updated_termin.dict()
            termin_gefunden = True
            break
            
    if not termin_gefunden:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
        
    write_db(termine)
    return {"message": f"Termin mit ID {termin_id} aktualisiert"}