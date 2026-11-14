<#
.SYNOPSIS
  One-command runner for the Bicol In-Heat API (FastAPI + /api/qa chatbot).

.DESCRIPTION
  Automates the three steps that were broken by hand:
    1. Installs missing Python deps into apps/api/.venv (uv, falls back to pip).
    2. Starts uvicorn main:app on 127.0.0.1:8000 (detached, logged).
    3. Health-checks GET / and smoke-tests POST /api/qa.

  The Vite dev server proxies /api -> localhost:8000 (vite.config.js), so this
  must be running for the Silli chatbot modal to reply.

.EXAMPLE
  .\serve.ps1            # setup + start + verify (idempotent; restarts cleanly)
  .\serve.ps1 -SetupOnly # install deps but do not start the server
  .\serve.ps1 -Stop      # stop a running server
  .\serve.ps1 -NoQA      # skip the live /api/qa smoke test (saves a model call)
#>
[CmdletBinding()]
param(
  [switch]$SetupOnly,
  [switch]$Stop,
  [switch]$NoQA,
  [int]$Port = 8000,
  [int]$TimeoutSec = 90
)

$ErrorActionPreference = 'Stop'
$ApiDir   = $PSScriptRoot
$VenvPy   = Join-Path $ApiDir '.venv\Scripts\python.exe'
$ReqFile  = Join-Path $ApiDir 'requirements.txt'
$LogFile  = Join-Path $ApiDir 'uvicorn.log'
$PidFile  = Join-Path $ApiDir '.uvicorn.pid'
$Base     = "http://127.0.0.1:$Port"

function Fail([string]$msg) {
  Write-Host "[serve] ERROR: $msg" -ForegroundColor Red
  exit 1
}

function Find-Uv {
  $candidates = @(
    (Join-Path $env:USERPROFILE '.local\bin\uv.exe'),
    'uv'
  )
  foreach ($c in $candidates) {
    if ($c -eq 'uv') { if (Get-Command uv -ErrorAction SilentlyContinue) { return 'uv' } }
    elseif (Test-Path $c) { return $c }
  }
  return $null
}

function Stop-Server {
  if (-not (Test-Path $PidFile)) { Write-Host '[serve] no pid file; nothing to stop.'; return }
  $oldPid = Get-Content $PidFile -ErrorAction SilentlyContinue
  if ($oldPid) {
    $p = Get-Process -Id $oldPid -ErrorAction SilentlyContinue
    if ($p) { Stop-Process -Id $oldPid -Force; Write-Host "[serve] stopped pid $oldPid." }
    else { Write-Host "[serve] pid $oldPid already gone." }
  }
  Remove-Item $PidFile -ErrorAction SilentlyContinue
}

if ($Stop) { Stop-Server; exit 0 }

# --- 1. Python environment -------------------------------------------------
$python = if (Test-Path $VenvPy) { $VenvPy } else { $null }
if (-not $python) {
  Write-Host '[serve] .venv missing - creating it...' -ForegroundColor Cyan
  $uv = Find-Uv
  if (-not $uv) { Fail "no .venv and no uv found. Install uv: https://docs.astral.sh/uv/" }
  & $uv venv (Join-Path $ApiDir '.venv')
  if ($LASTEXITCODE -ne 0) { Fail 'uv venv failed' }
  $python = $VenvPy
}

# Import check is the source of truth: a half-installed venv passes a file
# test but dies at `import main` (this is exactly how the chatbot broke).
# Must run with cwd = apps/api, or `import main` fails for path reasons and
# masks the real dependency error. -W ignore + Continue: google libs emit
# FutureWarnings on stderr, which PowerShell 5.1 promotes to errors.
function Test-Env {
  param([string]$Py, [string]$Cwd)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  Push-Location $Cwd
  try {
    $out = (& $Py -W ignore -c "import fastapi, uvicorn, openai, google.generativeai, supabase, dotenv; import main" 2>&1 | Out-String)
    return [pscustomobject]@{ Ok = ($LASTEXITCODE -eq 0); Output = $out }
  } finally {
    Pop-Location
    $ErrorActionPreference = $prev
  }
}

# Install only the modules that are actually missing. A full
# `uv pip install -r requirements.txt` is not safe as a repair step: the pin
# numpy==2.5.4 requires Python>=3.12 while this venv is 3.11, so the whole
# resolve fails and takes unrelated working packages down with it.
$moduleToPip = [ordered]@{
  'fastapi'             = 'fastapi'
  'uvicorn'             = 'uvicorn'
  'openai'              = 'openai'
  'google.generativeai' = 'google-generativeai'
  'supabase'            = 'supabase'
  'dotenv'              = 'python-dotenv'
}

$envCheck = Test-Env -Py $python -Cwd $ApiDir
if (-not $envCheck.Ok) {
  $missing = @()
  foreach ($m in $moduleToPip.Keys) {
    $prev = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
    & $python -W ignore -c "import $m" 2>&1 | Out-Null
    $failed = ($LASTEXITCODE -ne 0)
    $ErrorActionPreference = $prev
    if ($failed) { $missing += $moduleToPip[$m] }
  }
  if (-not $missing) {
    # Deps all present but `import main` still fails -> real code error, show it.
    Fail "imports fail with no missing packages:`n$($envCheck.Output)"
  }
  Write-Host "[serve] missing packages: $($missing -join ', ') - installing..." -ForegroundColor Cyan
  $uv = Find-Uv
  # Prefer the pin from requirements.txt when there is one for this package.
  $specs = foreach ($pkg in $missing) {
    $pin = Select-String -Path $ReqFile -Pattern "^$([regex]::Escape($pkg))==(\S+)" | Select-Object -First 1
    if ($pin) { "$pkg==$($pin.Matches[0].Groups[1].Value)" } else { $pkg }
  }
  if ($uv) { & $uv pip install --python $python @specs }
  else {
    & $python -m ensurepip --upgrade 2>&1 | Out-Null
    & $python -m pip install @specs
  }
  if ($LASTEXITCODE -ne 0) { Fail "install of $($specs -join ' ') failed" }
  $envCheck = Test-Env -Py $python -Cwd $ApiDir
  if (-not $envCheck.Ok) { Fail "still cannot import main after install:`n$($envCheck.Output)" }
}
Write-Host '[serve] python env OK (fastapi, openai, google.generativeai, supabase, main).' -ForegroundColor Green

if ($SetupOnly) { Write-Host '[serve] -SetupOnly: skipping start.'; exit 0 }

# --- 2. Start (or restart) uvicorn ----------------------------------------
Stop-Server

$serverPy = Join-Path $ApiDir '.venv\Scripts\python.exe'
$proc = Start-Process -FilePath $serverPy `
  -ArgumentList @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', "$Port") `
  -WorkingDirectory $ApiDir `
  -RedirectStandardOutput $LogFile `
  -RedirectStandardError "$LogFile.err" `
  -PassThru -WindowStyle Hidden
$proc.Id | Set-Content -Path $PidFile
Write-Host "[serve] uvicorn started (pid $($proc.Id)) -> $Base  (log: $LogFile)"

# --- 3. Health check -------------------------------------------------------
$deadline = (Get-Date).AddSeconds($TimeoutSec)
$healthy = $false
while ((Get-Date) -lt $deadline) {
  if ($proc.HasExited) {
    $err = if (Test-Path "$LogFile.err") { Get-Content "$LogFile.err" -Tail 20 } else { '(no log)' }
    Fail "uvicorn exited with code $($proc.Code):\n$err"
  }
  try {
    $r = Invoke-WebRequest -Uri "$Base/" -UseBasicParsing -TimeoutSec 3
    if ($r.StatusCode -eq 200) { $healthy = $true; break }
  } catch { Start-Sleep -Milliseconds 500 }
}
if (-not $healthy) { Fail "server did not become healthy within $TimeoutSec s - see $LogFile.err" }
Write-Host "[serve] GET / -> 200 $($r.Content)" -ForegroundColor Green

# --- 4. /api/qa smoke test -------------------------------------------------
if (-not $NoQA) {
  Write-Host '[serve] smoke-testing POST /api/qa ...'
  try {
    $body = @{ question = 'hello' } | ConvertTo-Json
    $qa = Invoke-WebRequest -Uri "$Base/api/qa" -Method Post -ContentType 'application/json' `
      -Body $body -UseBasicParsing -TimeoutSec 60
    $answer = ($qa.Content | ConvertFrom-Json).answer
    Write-Host "[serve] /api/qa -> 200 '$answer'" -ForegroundColor Green
  } catch {
    $status = $null; $detail = $_.Exception.Message
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $detail = $reader.ReadToEnd()
      } catch {}
    }
    Write-Host "[serve] /api/qa FAILED (HTTP $status): $detail" -ForegroundColor Yellow
    Write-Host '[serve] server IS up - the chatbot UI will show this detail. Common causes:' -ForegroundColor Yellow
    Write-Host '        - GROQ_API_KEY / GEMINI_API_KEY missing or invalid in apps/api/.env'
    Write-Host '        - Supabase unreachable (SUPABASE_URL / SUPABASE_SERVICE_KEY)'
    Write-Host '        - model rate-limited (429) - retry in a minute'
    exit 2
  }
}

Write-Host '[serve] ready. Chatbot path: Vite /api -> 127.0.0.1:' $Port -ForegroundColor Cyan
