# MySQL / MariaDB als Datenspeicher (optional)
o
In einer **Administrator**-PowerShell (gilt systemweit, der Task läuft als SYSTEM):

```powershell
[Environment]::SetEnvironmentVariable('KALENDER_STORAGE', 'mysql', 'Machine')
[Environment]::SetEnvironmentVariable('KALENDER_MYSQL_HOST', '127.0.0.1', 'Machine')
[Environment]::SetEnvironmentVariable('KALENDER_MYSQL_USER', 'kalender', 'Machine')
[Environment]::SetEnvironmentVariable('KALENDER_MYSQL_PASSWORD', 'EIN-STARKES-PASSWORT', 'Machine')
[Environment]::SetEnvironmentVariable('KALENDER_MYSQL_DATABASE', 'kalender', 'Machine')
Stop-ScheduledTask -TaskName BTL-Kalender; Start-ScheduledTask -TaskName BTL-Kalender
```
Maschinenweite Variablen kann jeder
lokale Administrator lesen – für das Passwort einen Datenbankbenutzer mit minimalen Rechten verwenden.

### Zum Ausprobieren (ohne Dienst)

```bash
cd backend
KALENDER_STORAGE=mysql KALENDER_MYSQL_PASSWORD=... venv/bin/python main.py --no-browser
```

## 4. Vorhandene JSON-Daten übernehmen

Beim Umschalten startet die App mit **leerer** Datenbank (neuer `admin` / `admin123`).
Bestehende Daten einmalig kopieren – vorher `backend/*.json` sichern, bei laufendem Dienst nicht:

```bash
sudo systemctl stop kalender                 # bzw. Task beenden
cd backend
export KALENDER_MYSQL_PASSWORD=...           # plus ggf. weitere KALENDER_MYSQL_*-Variablen
venv/bin/python - <<'PY'
from core.storage import JsonFileStorage, MySQLStorage
src, dst = JsonFileStorage(), MySQLStorage.from_env()
for name in ("users.json", "db.json", "mitarbeiter.json", "autos.json", "settings.json", "security.json"):
    data = src.read(name)
    if data:                                 # fehlende/leere Dateien überspringen
        dst.write(name, data)
        print("übernommen:", name)
PY
```
Danach `KALENDER_STORAGE=mysql` setzen und den Dienst starten. Die JSON-Dateien bleiben
unverändert liegen und dienen als Rückfallebene (`KALENDER_STORAGE` wieder entfernen).

## 5. Betrieb

- **Nur ein App-Prozess** (ein uvicorn-Worker): die Sperre gegen gleichzeitige Schreibzugriffe
  gilt innerhalb des Prozesses. Mehrere Instanzen auf derselben Datenbank können sich gegenseitig
  Änderungen überschreiben.
- **Backup:** `mysqldump kalender > kalender-$(date +%F).sql` (statt der JSON-Dateien).
- **Inhalt ansehen:** `SELECT name, updated_at, JSON_LENGTH(data) FROM kalender_documents;`
- **Fehler beim Start** (`Can't connect`, `Access denied`, `Unknown database`): Host, Zugangsdaten
  und ob die Datenbank existiert prüfen. Die Meldung steht im Log (`journalctl -u kalender -f`).
- Die Datenbank liegt nicht im Repository; ein `git pull` ändert sie nicht.
