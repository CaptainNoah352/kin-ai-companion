$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $env:LOCALAPPDATA "Kin"
$LogPath = Join-Path $LogDir "kin-startup.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-KinLog {
  param([string] $Message)
  "[$(Get-Date -Format o)] $Message" | Out-File -FilePath $LogPath -Append -Encoding utf8
}

function Test-PortListening {
  param([int] $Port)
  return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Start-TailscaleDesktop {
  $TailscaleIpnPath = Join-Path $env:ProgramFiles "Tailscale\tailscale-ipn.exe"
  $TailscaleCliPath = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"

  if (-not (Test-Path -LiteralPath $TailscaleIpnPath)) {
    Write-KinLog "Tailscale desktop app was not found at $TailscaleIpnPath."
    return
  }

  if (-not (Get-Process -Name "tailscale-ipn" -ErrorAction SilentlyContinue)) {
    Write-KinLog "Starting Tailscale desktop app."
    Start-Process -FilePath $TailscaleIpnPath
  } else {
    Write-KinLog "Tailscale desktop app is already running."
  }

  if (-not (Test-Path -LiteralPath $TailscaleCliPath)) {
    return
  }

  for ($Attempt = 1; $Attempt -le 10; $Attempt += 1) {
    $StatusJson = & $TailscaleCliPath status --json 2>$null
    if ($StatusJson -and ($StatusJson -match '"BackendState"\s*:\s*"Running"')) {
      Write-KinLog "Tailscale backend is Running."
      return
    }
    Start-Sleep -Seconds 2
  }

  Write-KinLog "Tailscale backend did not report Running before Kin startup."
}

Set-Location -LiteralPath $ProjectRoot
Start-TailscaleDesktop

if ((Test-PortListening 8787) -or (Test-PortListening 988)) {
  Write-KinLog "Kin startup skipped because port 8787 or 988 is already listening."
  exit 0
}

Write-KinLog "Starting Kin from scheduled task."
& npm.cmd start *>> $LogPath
