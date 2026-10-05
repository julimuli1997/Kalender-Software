<#
 Registers BTL Kalender as a Scheduled Task that starts at boot (before any
 user logs in), runs as SYSTEM, and restarts itself if it crashes.
 Run once from an elevated (Administrator) PowerShell:
     powershell -ExecutionPolicy Bypass -File deploy\windows\install-startup.ps1
 Optional: -Port 8000 -OpenFirewall
#>
param(
    [int]$Port = 8000,
    [switch]$OpenFirewall
)
$ErrorActionPreference = 'Stop'

$principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Bitte als Administrator ausführen.'
}

$appDir  = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$backend = Join-Path $appDir 'backend'
$taskName = 'BTL-Kalender'

if (-not (Test-Path (Join-Path $backend 'dist\index.html'))) {
    throw 'backend\dist fehlt. Erst das Frontend bauen (siehe deploy\README.md).'
}

# Prefer the packaged exe, otherwise use a Python virtualenv.
$exe = Join-Path $backend 'dist-exe\BTL-Kalender.exe'
if (Test-Path $exe) {
    $execute = $exe
    $arguments = '--no-browser'
} else {
    $venvPython = Join-Path $backend 'venv\Scripts\python.exe'
    if (-not (Test-Path $venvPython)) {
        Write-Host '→ Python-Umgebung einrichten'
        python -m venv (Join-Path $backend 'venv')
        & $venvPython -m pip install -q -r (Join-Path $backend 'requirements.txt')
    }
    $execute = $venvPython
    $arguments = "`"$(Join-Path $backend 'main.py')`" --no-browser"
}

$env:KALENDER_PORT = "$Port"
[Environment]::SetEnvironmentVariable('KALENDER_PORT', "$Port", 'Machine')

$action    = New-ScheduledTaskAction -Execute $execute -Argument $arguments -WorkingDirectory $backend
$trigger   = New-ScheduledTaskTrigger -AtStartup
$principalT = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings  = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
             -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable `
             -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
    -Principal $principalT -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $taskName

if ($OpenFirewall) {
    Remove-NetFirewallRule -DisplayName $taskName -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName $taskName -Direction Inbound -Protocol TCP `
        -LocalPort $Port -Action Allow | Out-Null
    Write-Host "→ Firewall: Port $Port freigegeben"
}

Write-Host "✓ Installiert und gestartet. Aufruf: http://localhost:$Port"
Write-Host "  Status: Get-ScheduledTask -TaskName $taskName | Get-ScheduledTaskInfo"
