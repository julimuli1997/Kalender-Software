# Removes the startup task (app files and data are kept). Run as Administrator.
$ErrorActionPreference = 'Stop'
Stop-ScheduledTask -TaskName 'BTL-Kalender' -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName 'BTL-Kalender' -Confirm:$false -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName 'BTL-Kalender' -ErrorAction SilentlyContinue
Write-Host '✓ Autostart entfernt.'
