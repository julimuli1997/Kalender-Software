import os
import sys

# All data files (users.json, db.json, dist/, ...) are resolved relative to the
# working directory. Pin it to the app folder so it also works when started by a
# service manager (Windows Task Scheduler / systemd), which use other directories.
BASE_DIR = os.path.dirname(sys.executable if getattr(sys, "frozen", False) else os.path.abspath(__file__))
os.chdir(BASE_DIR)

# Ensure current directory is in sys.path for module resolution
sys.path.insert(0, BASE_DIR)

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from core.auth import calendar_view_is_public, user_for_token
from core.websocket import manager
from routers import mitarbeiter, autos, termine, settings, users, user_admin, account, admin_security
from routers.users import ensure_default_admin

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_default_admin()
    yield

app = FastAPI(title="BTL Kalender Software", lifespan=lifespan)

# The frontend is served by this app (same origin), so CORS is off by default.
# For a separately hosted frontend: KALENDER_CORS_ORIGINS="https://a.example,https://b.example"
cors_origins = [o.strip() for o in os.environ.get("KALENDER_CORS_ORIGINS", "").split(",") if o.strip()]
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register API Routers
app.include_router(users.router)
app.include_router(user_admin.router)
app.include_router(account.router)
app.include_router(admin_security.router)
app.include_router(mitarbeiter.router)
app.include_router(autos.router)
app.include_router(termine.router)
app.include_router(settings.router)

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Open for the TV view unless the admin requires a login; the token comes as ?token=...
    if not calendar_view_is_public():
        try:
            user = user_for_token(websocket.query_params.get("token"))
            if user.get("must_change_password"):
                raise HTTPException(status_code=403)
        except HTTPException:
            await websocket.close(code=4401)
            return
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# Serve React Frontend Static Files (SPA fallback routing)
if os.path.exists("dist"):
    if os.path.exists("dist/assets"):
        app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join("dist", full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse("dist/index.html")

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
        # Headless/service start: python main.py --no-browser
        if "--no-browser" not in sys.argv:
            threading.Timer(1.5, open_browser).start()
        uvicorn.run(
            app,
            host=os.environ.get("KALENDER_HOST", "0.0.0.0"),
            port=int(os.environ.get("KALENDER_PORT", "8000")),
        )
    except Exception as e:
        with open("crash_log.txt", "w", encoding="utf-8") as f:
            f.write(traceback.format_exc())