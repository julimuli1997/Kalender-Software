#!/usr/bin/env bash
# Installs BTL Kalender as a systemd service that starts on boot.
# Usage: sudo ./deploy/linux/install.sh [service-user]
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "Bitte mit sudo ausführen." >&2; exit 1; fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVICE_USER="${1:-${SUDO_USER:-root}}"
UNIT=/etc/systemd/system/kalender.service

[[ -f "$APP_DIR/backend/dist/index.html" ]] || {
  echo "backend/dist fehlt. Erst das Frontend bauen (siehe deploy/README.md)." >&2; exit 1; }

echo "→ Python-Umgebung einrichten"
sudo -u "$SERVICE_USER" python3 -m venv "$APP_DIR/backend/venv"
sudo -u "$SERVICE_USER" "$APP_DIR/backend/venv/bin/pip" install -q -r "$APP_DIR/backend/requirements.txt"

echo "→ systemd-Dienst installieren ($UNIT)"
sed -e "s|__APP_DIR__|$APP_DIR|g" -e "s|__USER__|$SERVICE_USER|g" \
  "$APP_DIR/deploy/linux/kalender.service.template" > "$UNIT"
systemctl daemon-reload
systemctl enable --now kalender.service

echo "✓ Läuft. Status: systemctl status kalender   Logs: journalctl -u kalender -f"
echo "  Port 8000 ggf. in der Firewall freigeben (z.B. 'sudo ufw allow 8000/tcp')."
