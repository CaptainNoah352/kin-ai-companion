$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $env:LOCALAPPDATA "Kin"
$LogPath = Join-Path $LogDir "kin-desktop-startup.log"
$DesktopExe = Join-Path $ProjectRoot "release\win-unpacked\Kin.exe"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-KinLog {
  param([string] $Message)
  "[$(Get-Date -Format o)] $Message" | Out-File -FilePath $LogPath -Append -Encoding utf8
}

Set-Location -LiteralPath $ProjectRoot

if (Test-Path -LiteralPath $DesktopExe) {
  Write-KinLog "Starting packaged Kin desktop app from $DesktopExe."
  Start-Process -FilePath $DesktopExe -WorkingDirectory $ProjectRoot
  exit 0
}

$NpmCommand = Get-Command npm.cmd -ErrorAction Stop
Write-KinLog "Packaged Kin desktop app was not found; starting Electron from source."
Start-Process -FilePath $NpmCommand.Source -ArgumentList @("run", "desktop:start") -WorkingDirectory $ProjectRoot -WindowStyle Hidden
