# MySQL / MariaDB als Datenspeicher (optional)

Standardmäßig speichert die App ihre Daten in `backend/*.json`. Mit MySQL (oder MariaDB)
werden dieselben Daten stattdessen in einer Datenbank abgelegt. Die Umschaltung erfolgt
nur über Umgebungsvariablen – am Code ändert sich nichts.

Pro Dokument (Termine, Benutzer, Mitarbeiter, Autos, Einstellungen, Sicherheit) gibt es eine
Zeile in der Tabelle `kalender_documents`. Die Tabelle wird beim ersten Start automatisch angelegt.

## 0. MySQL-Server installieren (falls noch nicht vorhanden)

Der Server wird über den Paketmanager installiert (kein einzelner Download). MariaDB und MySQL
funktionieren beide mit der App.

**Linux (Debian/Ubuntu)**
```bash
sudo apt update && sudo apt install -y mariadb-server     # oder: mysql-server
sudo systemctl enable --now mariadb                       # bzw. mysql
sudo mysql_secure_installation                            # optional, empfohlen
```

**Windows**
MySQL Installer (MSI) von dev.mysql.com ausführen oder `winget install Oracle.MySQL`.
Der Server läuft danach als Windows-Dienst.

**macOS (nur Entwicklung)**
```bash
brew install mysql && brew services start mysql
```

**Docker (alle Systeme)** – legt Datenbank und Benutzer direkt an, Schritt 1 entfällt dann
(Passwörter ersetzen; Port 3306 ist nur lokal erreichbar):
```bash
docker run -d --name kalender-db --restart unless-stopped \
  -e MYSQL_ROOT_PASSWORD=ROOT-PASSWORT -e MYSQL_DATABASE=kalender \
  -e MYSQL_USER=kalender -e MYSQL_PASSWORD=EIN-STARKES-PASSWORT \
  -p 127.0.0.1:3306:3306 -v kalender-db:/var/lib/mysql mysql:8
```

## 1. Datenbank und Benutzer anlegen

Als MySQL-Admin (`sudo mysql` bzw. `mysql -u root -p`):

```sql
CREATE DATABASE kalender CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kalender'@'localhost' IDENTIFIED BY 'EIN-STARKES-PASSWORT';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE ON kalender.* TO 'kalender'@'localhost';
FLUSH PRIVILEGES;
```

- Läuft MySQL auf einem anderen Rechner, statt `'localhost'` die IP/den Host des App-Servers
  eintragen und Port 3306 nur für diesen Rechner freigeben.
- Das Recht `CREATE` wird nur für die automatische Tabellenanlage gebraucht. Wer die Tabelle
  selbst anlegt (siehe unten), kann es danach entziehen.

## 2. Treiber installieren

`PyMySQL` steht in `backend/requirements.txt`. Bei bestehenden Installationen nachziehen:

```bash
backend/venv/bin/pip install -r backend/requirements.txt          # Linux/macOS
backend\venv\Scripts\pip install -r backend\requirements.txt      # Windows
```

## 3. Umgebungsvariablen setzen

| Variable                  | Standard             | Bedeutung                                   |
|---------------------------|----------------------|---------------------------------------------|
| `KALENDER_STORAGE`        | `json`               | `mysql` aktiviert die Datenbank             |
| `KALENDER_MYSQL_HOST`     | `127.0.0.1`          | Server                                      |
| `KALENDER_MYSQL_PORT`     | `3306`               | Port                                        |
| `KALENDER_MYSQL_USER`     | `kalender`           | Benutzer                                    |
| `KALENDER_MYSQL_PASSWORD` | *(leer)*             | Passwort                                    |
| `KALENDER_MYSQL_DATABASE` | `kalender`           | Datenbank (muss existieren)                 |
| `KALENDER_MYSQL_TABLE`    | `kalender_documents` | Tabellenname (nur `A-Z a-z 0-9 _`)          |

### Linux (systemd)

Passwort nicht in die Service-Datei schreiben, sondern in eine geschützte Datei:

```bash
sudo tee /etc/kalender.env >/dev/null <<'ENV'
KALENDER_STORAGE=mysql
KALENDER_MYSQL_HOST=127.0.0.1
KALENDER_MYSQL_USER=kalender
KALENDER_MYSQL_PASSWORD=EIN-STARKES-PASSWORT
KALENDER_MYSQL_DATABASE=kalender
ENV
sudo chmod 600 /etc/kalender.env      # systemd liest die Datei als root

sudo systemctl edit kalender          # im Editor einfügen:
#   [Service]
#   EnvironmentFile=/etc/kalender.env
sudo systemctl restart kalender
```

### Windows (Aufgabenplanung)

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
