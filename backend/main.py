import os
import sys

# Ensure current directory is in sys.path for module resolution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from core.websocket import manager
from routers import mitarbeiter, autos, termine, settings

app = FastAPI(title="BTL Kalender Software")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(mitarbeiter.router)
app.include_router(autos.router)
app.include_router(termine.router)
app.include_router(settings.router)

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Serve React Frontend Static Files
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")

    @app.exception_handler(404)
    async def custom_404_handler(request, exc):
        return FileResponse('dist/index.html')

# PyInstaller / Server execution runner
import uvicorn
import multiprocessing
import traceback
import webbrowser
import threading

def open_browser():
    webbrowser.open("http://localhost:8000")

if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    # Standard I/O redirection for noconsole mode
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