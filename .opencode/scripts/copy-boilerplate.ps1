<#
.SYNOPSIS
    Copies the .opencode/ boilerplate to a target project folder.

.DESCRIPTION
    Reusable opencode harness (agents, commands, skills, plugin, opencode.json,
    AGENTS.md, README.md) for new projects. Copies the .opencode/ directory
    from two levels above this script (the boilerplate source project) into
    the target, excluding session notes and node_modules.

    Plugins referenced by default — opencode-wakatime and
    opencode-helicone-session — are installed on first opencode startup.
    Comment them out of .opencode/opencode.json to disable.

.PARAMETER Target
    Path of the target project folder. Required.

.PARAMETER NoInstall
    Skip the automatic `opencode plugin add` install step. Optional.

.EXAMPLE
    .\copy-boilerplate.ps1 -Target C:\repos\my-new-app

.EXAMPLE
    .\copy-boilerplate.ps1 -Target .\my-new-app -NoInstall
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Target,
    [switch]$NoInstall
)

$ErrorActionPreference = 'Stop'

# This script lives at <boilerplate>/.opencode/scripts/copy-boilerplate.ps1
$sourceOpenCode = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$sourceRoot     = (Split-Path $sourceOpenCode -Parent)

$targetRoot = (Resolve-Path $Target).Path
$targetOpenCode = Join-Path $targetRoot '.opencode'

if (-not (Test-Path -LiteralPath $targetOpenCode)) {
    $null = New-Item -ItemType Directory -Path $targetOpenCode -Force
}

Write-Host "Copying opencode boilerplate from: $sourceOpenCode"
Write-Host "Into target project:               $targetRoot"

# Exclusions — session notes (machine/context-specific) and node_modules.
$exclude = @('.opencode\sessions', '.opencode\node_modules', 'node_modules')

Get-ChildItem -LiteralPath $sourceOpenCode -Recurse -Force |
    Where-Object {
        $full = $_.FullName
        $rel  = $full.Substring($sourceOpenCode.Length).TrimStart('\', '/')
        -not ($exclude | Where-Object { $rel -like "$_*" })
    } |
    ForEach-Object {
        $dest = Join-Path $targetOpenCode $_.FullName.Substring($sourceOpenCode.Length)
        if ($_.PSIsContainer) {
            $null = New-Item -ItemType Directory -Path $dest -Force
        }
        else {
            $null = New-Item -ItemType Directory -Path (Split-Path $dest -Parent) -Force
            Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
        }
    }

Write-Host "Done. Copied boilerplate to: $targetOpenCode"

if (-not $NoInstall) {
    Write-Host "Installing default plugins for the target project (hit Enter on prompts)..."
    Push-Location $targetRoot
    try {
        opencode plugin add opencode-wakatime 2>$null
        opencode plugin add opencode-helicone-session 2>$null
    }
    finally {
        Pop-Location
    }
}

Write-Host "Next: restart opencode in $targetRoot to load the new config."