# Deployment: automatischer Start beim Hochfahren

Die Anwendung ist ein einzelner Prozess (FastAPI), der auch das Frontend ausliefert.
Standard-Port: **8000** (änderbar mit `KALENDER_PORT`).

## 1. Frontend bauen (einmalig bzw. nach jeder UI-Änderung)

```bash
cd frontend && npm install && npm run build
# Inhalt von frontend/dist nach backend/dist kopieren
rm -rf ../backend/dist && cp -r dist ../backend/dist          # Linux/macOS
# Windows (PowerShell): Remove-Item ..\backend\dist -Recurse -Force; Copy-Item dist ..\backend\dist -Recurse
```

## 2a. Linux-Server (systemd)

```bash
sudo ./deploy/linux/install.sh            # läuft als der aufrufende Benutzer
sudo ./deploy/linux/install.sh kalender   # oder als eigener Dienst-Benutzer
```
Status `systemctl status kalender`, Logs `journalctl -u kalender -f`,
entfernen mit `sudo ./deploy/linux/uninstall.sh`. Port freigeben: `sudo ufw allow 8000/tcp`.

## 2b. Windows-PC (Aufgabenplanung)

In einer **Administrator**-PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\install-startup.ps1 -OpenFirewall
```
Der Task startet beim Booten (ohne Anmeldung) als SYSTEM und startet sich bei Absturz neu.
Entfernen mit `deploy\windows\uninstall-startup.ps1`. Voraussetzung: Python 3.12+ im PATH
(oder eine gebaute `backend\dist-exe\BTL-Kalender.exe`).

## Wichtig nach der Installation
- Standard-Login beim ersten Start: `admin` / `admin123`. Die App verlangt direkt nach dem
  ersten Login ein neues Passwort und sperrt bis dahin alles andere.
- Daten liegen in `backend/*.json` – regelmäßig sichern. Die Dateien sind per `.gitignore` nicht im
  Repository; ein `git pull` auf dem Server berührt sie nicht (außer das Repo wurde vor dem
  Aufräumen geklont: dann vorher sichern).
- TV-Ansicht ohne Login ist Standard. Unter Konfiguration → Sicherheit lässt sich das abschalten.
- Tests: `cd backend && pip install -r requirements-dev.txt && pytest`
- Das Programm mit `--no-browser` öffnet keinen Browser (für Server/Autostart).
