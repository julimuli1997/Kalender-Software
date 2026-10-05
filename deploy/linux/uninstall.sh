#!/usr/bin/env bash
# Removes the systemd service (app files and data are kept).
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo "Bitte mit sudo ausführen." >&2; exit 1; fi
systemctl disable --now kalender.service 2>/dev/null || true
rm -f /etc/systemd/system/kalender.service
systemctl daemon-reload
echo "✓ Dienst entfernt."
