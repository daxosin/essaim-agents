<#
.SYNOPSIS
  Installe les skills essaim et avocat-du-diable, les agents et les outils dans un projet Claude Code (ou globalement).
.EXAMPLE
  .\install.ps1 -Projet "C:\Users\<vous>\projets\mon-projet"
.EXAMPLE
  .\install.ps1 -Global
#>
[CmdletBinding()]
param(
  [string]$Projet = (Get-Location).Path,
  [switch]$Global
)
$ErrorActionPreference = 'Stop'
$Source = $PSScriptRoot
$Utf8 = New-Object System.Text.UTF8Encoding $false

# 1. Node 18+
try { $v = (& node --version) -replace '^v', '' } catch { throw "Node.js introuvable. Installer Node 18 ou plus récent (https://nodejs.org)." }
if ([int]($v.Split('.')[0]) -lt 18) { throw "Node $v trop ancien : 18 minimum." }

# 2. Cibles
if ($Global) {
  $Base   = Join-Path $HOME '.claude'
  $Outils = Join-Path $Base 'outils'
} else {
  if (-not (Test-Path $Projet)) { throw "Dossier projet introuvable : $Projet" }
  $Base   = Join-Path $Projet '.claude'
  $Outils = Join-Path $Projet 'outils'
}
$Cibles = @(
  @{ De = 'skills\essaim\SKILL.md';           Vers = Join-Path $Base 'skills\essaim\SKILL.md' },
  @{ De = 'skills\avocat-du-diable\SKILL.md'; Vers = Join-Path $Base 'skills\avocat-du-diable\SKILL.md' },
  @{ De = 'agents\fourrageur.md';             Vers = Join-Path $Base 'agents\fourrageur.md' },
  @{ De = 'agents\validateur.md';             Vers = Join-Path $Base 'agents\validateur.md' },
  @{ De = 'agents\critique.md';               Vers = Join-Path $Base 'agents\critique.md' },
  @{ De = 'outils\milieu.mjs';                Vers = Join-Path $Outils 'milieu.mjs' },
  @{ De = 'outils\panel.mjs';                 Vers = Join-Path $Outils 'panel.mjs' }
)

# 3. Copie, avec sauvegarde de toute version locale différente
$Horodatage = Get-Date -Format 'yyyyMMdd-HHmmss'
foreach ($c in $Cibles) {
  $de = Join-Path $Source $c.De
  New-Item -ItemType Directory -Force -Path (Split-Path $c.Vers) | Out-Null
  if ((Test-Path $c.Vers) -and ((Get-FileHash $c.Vers).Hash -ne (Get-FileHash $de).Hash)) {
    Copy-Item $c.Vers "$($c.Vers).bak-$Horodatage"
    Write-Host "  sauvegarde : $($c.Vers).bak-$Horodatage" -ForegroundColor Yellow
  }
  Copy-Item $de $c.Vers -Force
  Write-Host "  installé   : $($c.Vers)"
}

# 4. Le milieu et les sorties du panel ne se commitent pas
if (-not $Global) {
  $gi = Join-Path $Projet '.gitignore'
  $deja = if (Test-Path $gi) { Get-Content $gi } else { @() }
  foreach ($l in @('_milieu/', '_panel/')) {
    if ($deja -notcontains $l) { [IO.File]::AppendAllText($gi, "$l`n", $Utf8); Write-Host "  .gitignore : $l" }
  }
}

# 5. Vérification
Write-Host "`nTests :" -ForegroundColor Cyan
Push-Location $Source
try { & node --test "tests/*.test.mjs" | Select-String -Pattern '^# (pass|fail)' } finally { Pop-Location }

# 6. Clé OpenRouter (pour avocat-du-diable)
if (-not $env:OPENROUTER_API_KEY -and -not [Environment]::GetEnvironmentVariable('OPENROUTER_API_KEY', 'User')) {
  Write-Host "`nOPENROUTER_API_KEY absente. Pour l'enregistrer (une fois, puis rouvrir le terminal) :" -ForegroundColor Yellow
  Write-Host '  [Environment]::SetEnvironmentVariable("OPENROUTER_API_KEY", "sk-or-...", "User")'
}
Write-Host "`nTerminé. Dans Claude Code : « essaim » pour qualifier un travail, « avocat du diable » pour un panel." -ForegroundColor Green
