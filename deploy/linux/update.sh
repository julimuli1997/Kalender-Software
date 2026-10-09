#!/usr/bin/env bash
# Updates BTL Kalender: pulls the code, rebuilds the frontend, restarts the service.
# Usage: ./deploy/linux/update.sh        (as the user who owns the repo, NOT with sudo;
#                                         sudo is only asked for the service restart)
set -euo pipefail

if [[ $EUID -eq 0 ]]; then echo "Bitte ohne sudo ausführen." >&2; exit 1; fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${KALENDER_PORT:-8000}"
cd "$APP_DIR"

echo "→ Code aktualisieren"
git pull --ff-only

echo "→ Python-Abhängigkeiten"
backend/venv/bin/pip install -q -r backend/requirements.txt

# Build while the old version keeps running; a failed build stops here and changes nothing.
echo "→ Frontend bauen"
(cd frontend && npm ci --silent && npm run build)

echo "→ Frontend austauschen"
rm -rf backend/dist.new
cp -r frontend/dist backend/dist.new
rm -rf backend/dist
mv backend/dist.new backend/dist

echo "→ Dienst neu starten"
sudo systemctl restart kalender

# Check that the running server really delivers the build we just made.
built="$(grep -o 'index-[^"]*\.js' frontend/dist/index.html)"
for _ in {1..15}; do
  served="$(curl -fs "http://localhost:$PORT/" | grep -o 'index-[^"]*\.js' || true)"
  if [[ "$served" == "$built" ]]; then
    echo "✓ Aktualisiert auf $(git log -1 --format='%h %s'). Im Browser hart neu laden (Strg+Umschalt+R)."
    exit 0
  fi
  sleep 1
done

echo "✗ Der Server liefert nicht den neuen Build aus (erwartet: $built, erhalten: ${served:-nichts})." >&2
echo "  Logs: journalctl -u kalender -n 50" >&2
exit 1
