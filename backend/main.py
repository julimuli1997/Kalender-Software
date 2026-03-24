from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
from typing import List, Dict, Any

# Define the data model for an event
# Using 'id' as an optional field for creation
class Event(BaseModel):
    id: int
    title: str
    start: str
    end: str

# Path to the JSON database file
DB_FILE = "db.json"

# Initialize the FastAPI app
app = FastAPI()

# CORS (Cross-Origin Resource Sharing) middleware
# This allows the frontend (running on a different URL) to communicate with the backend
origins = [
    "http://localhost:5173",  # Default Vite dev server URL
    "http://localhost:3000",  # Default Create React App dev server URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to read the database
def read_db() -> List[Dict[str, Any]]:
    if not os.path.exists(DB_FILE):
        return []
    with open(DB_FILE, "r") as f:
        try:
            data = json.load(f)
            return data
        except json.JSONDecodeError:
            return []

# Helper function to write to the database
def write_db(data: List[Dict[str, Any]]):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=4)

# API endpoint to get all events
@app.get("/api/termine", response_model=List[Event])
def get_events():
    return read_db()

# API endpoint to create a new event
@app.post("/api/termine", response_model=Event)
def create_event(event: Event):
    events = read_db()
    events.append(event.dict())
    write_db(events)
    return event

# A root endpoint for basic testing
@app.get("/")
def read_root():
    return {"message": "Kalender Backend is running"}
