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

## 3. Updates / Patches einspielen

Reihenfolge: Dienst stoppen → Code holen → Abhängigkeiten → Frontend neu bauen → nach
`backend/dist` kopieren → Dienst starten. Vorher die Daten sichern (`backend/*.json` bzw. `mysqldump`).
Alle Befehle im Hauptordner des Repositories ausführen.

**Linux – ein Befehl** (ohne sudo starten; das Skript fragt nur für den Neustart danach):
```bash
./deploy/linux/update.sh
```
Das Skript baut zuerst und startet den Dienst erst danach neu. Schlägt der Build fehl, läuft die
alte Version unverändert weiter. Am Ende prüft es, ob der Server den neuen Build ausliefert.

**Linux – von Hand**
```bash
sudo systemctl stop kalender
git pull
backend/venv/bin/pip install -r backend/requirements.txt
(cd frontend && npm install && npm run build)
rm -rf backend/dist && cp -r frontend/dist backend/dist
sudo systemctl start kalender
```

**Windows** (Administrator-PowerShell)
```powershell
Stop-ScheduledTask -TaskName BTL-Kalender
git pull
backend\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd frontend; npm install; npm run build; cd ..
Remove-Item backend\dist -Recurse -Force; Copy-Item frontend\dist backend\dist -Recurse
Start-ScheduledTask -TaskName BTL-Kalender
```
Läuft der Task mit der gebauten `BTL-Kalender.exe`, wirken Backend-Änderungen erst nach einem
neuen Build der exe. Die exe sucht den Ordner `dist` außerdem neben sich selbst, nicht in `backend\dist`.

**Prüfen, ob die neue Version ausgeliefert wird** – beide Befehle müssen denselben Dateinamen zeigen:
```bash
grep -o 'index-[^"]*\.js' frontend/dist/index.html
curl -s http://localhost:8000/ | grep -o 'index-[^"]*\.js'
```
- Namen verschieden: `backend/dist` wurde vor dem Kopieren nicht gelöscht (dann liegt der neue Build
  in `backend/dist/dist`), der Build ist fehlgeschlagen oder es läuft noch ein alter Prozess.
- Namen gleich, im Browser aber alt: Seite hart neu laden (Strg+Umschalt+R), auch auf dem TV.

## 4. Dienst stoppen / starten / neu starten

**Linux**
```bash
sudo systemctl stop kalender
sudo systemctl start kalender
sudo systemctl restart kalender      # stoppen + starten in einem Schritt
systemctl status kalender            # läuft er?
journalctl -u kalender -f            # Logs
```

**Windows** (Administrator-PowerShell)
```powershell
Stop-ScheduledTask -TaskName BTL-Kalender
Start-ScheduledTask -TaskName BTL-Kalender
Get-ScheduledTask -TaskName BTL-Kalender | Get-ScheduledTaskInfo    # Status
```

**Ohne Dienst (von Hand gestartet)**
```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN     # PID des laufenden Prozesses finden
kill <PID>                           # stoppen (oder Strg+C im Terminal)
cd backend && venv/bin/python main.py --no-browser    # starten
```
Immer nur eine Instanz laufen lassen: erst stoppen, dann starten.

## Wichtig nach der Installation
- Standard-Login beim ersten Start: `admin` / `admin123`. Die App verlangt direkt nach dem
  ersten Login ein neues Passwort und sperrt bis dahin alles andere.
- Daten liegen standardmäßig in `backend/*.json` – regelmäßig sichern. Optional lassen sie sich in
  MySQL/MariaDB speichern: siehe [MYSQL.md](MYSQL.md).
  Die JSON-Dateien sind per `.gitignore` nicht im
  Repository; ein `git pull` auf dem Server berührt sie nicht (außer das Repo wurde vor dem
  Aufräumen geklont: dann vorher sichern).
- TV-Ansicht ohne Login ist Standard. Unter Konfiguration → Sicherheit lässt sich das abschalten.
- Tests: `cd backend && pip install -r requirements-dev.txt && pytest`
- Das Programm mit `--no-browser` öffnet keinen Browser (für Server/Autostart).
