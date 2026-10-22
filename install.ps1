<#
.SYNOPSIS
  Installe les skills essaim et avocat-du-diable, les agents, les outils et le garde mécanique
  dans un projet Claude Code, ou globalement.
.EXAMPLE
  .\install.ps1 -Projet "C:\Users\<vous>\projets\mon-projet"
.EXAMPLE
  .\install.ps1 -Global
.EXAMPLE
  .\install.ps1 -Projet "..." -SansGarde      # n'installe pas le hook PreToolUse
#>
[CmdletBinding()]
param(
  [string]$Projet = (Get-Location).Path,
  [switch]$Global,
  [switch]$SansGarde
)
$ErrorActionPreference = 'Stop'
$Source = $PSScriptRoot
$Utf8 = New-Object System.Text.UTF8Encoding $false

# 1. Node 18+
try { $v = (& node --version) -replace '^v', '' } catch { throw "Node.js introuvable. Installer Node 18 ou plus récent (https://nodejs.org)." }
if ([int]($v.Split('.')[0]) -lt 18) { throw "Node $v trop ancien : 18 minimum." }

# 2. Cibles (chemins absolus : .NET ne connaît pas le dossier courant de PowerShell)
if ($Global) {
  $Base   = Join-Path $HOME '.claude'
  $Outils = Join-Path $Base 'outils'
  $Reglages = Join-Path $Base 'settings.json'
} else {
  if (-not (Test-Path -LiteralPath $Projet -PathType Container)) { throw "Dossier projet introuvable : $Projet" }
  $Projet = (Resolve-Path -LiteralPath $Projet).Path
  $Base   = Join-Path $Projet '.claude'
  $Outils = Join-Path $Projet 'outils'
  $Reglages = Join-Path $Base 'settings.json'
}
$Cibles = @(
  @{ De = 'skills\essaim\SKILL.md';           Vers = Join-Path $Base 'skills\essaim\SKILL.md' },
  @{ De = 'skills\avocat-du-diable\SKILL.md'; Vers = Join-Path $Base 'skills\avocat-du-diable\SKILL.md' },
  @{ De = 'agents\fourrageur.md';             Vers = Join-Path $Base 'agents\fourrageur.md' },
  @{ De = 'agents\eclaireur.md';              Vers = Join-Path $Base 'agents\eclaireur.md' },
  @{ De = 'agents\controleur.md';             Vers = Join-Path $Base 'agents\controleur.md' },
  @{ De = 'agents\critique.md';               Vers = Join-Path $Base 'agents\critique.md' },
  @{ De = 'outils\milieu.mjs';                Vers = Join-Path $Outils 'milieu.mjs' },
  @{ De = 'outils\avocat.mjs';                Vers = Join-Path $Outils 'avocat.mjs' },
  @{ De = 'outils\journal.mjs';               Vers = Join-Path $Outils 'journal.mjs' },
  @{ De = 'outils\garde-essaim.mjs';          Vers = Join-Path $Outils 'garde-essaim.mjs' }
)

# 3. Copie, avec sauvegarde de toute version locale différente
$Horodatage = Get-Date -Format 'yyyyMMdd-HHmmss'
foreach ($c in $Cibles) {
  $de = Join-Path $Source $c.De
  New-Item -ItemType Directory -Force -Path (Split-Path -LiteralPath $c.Vers) | Out-Null
  if ((Test-Path -LiteralPath $c.Vers) -and ((Get-FileHash -LiteralPath $c.Vers).Hash -ne (Get-FileHash -LiteralPath $de).Hash)) {
    Copy-Item -LiteralPath $c.Vers -Destination "$($c.Vers).bak-$Horodatage"
    Write-Host "  sauvegarde : $($c.Vers).bak-$Horodatage" -ForegroundColor Yellow
  }
  Copy-Item -LiteralPath $de -Destination $c.Vers -Force
  Write-Host "  installé   : $($c.Vers)"
}

# 4. Garde mécanique : hook PreToolUse fusionné dans settings.json (sauvegardé avant)
if (-not $SansGarde) {
  $garde = Join-Path $Outils 'garde-essaim.mjs'
  $commande = if ($Global) { "node `"$($garde -replace '\\', '/')`"" } else { 'node "${CLAUDE_PROJECT_DIR}/outils/garde-essaim.mjs"' }
  # passée par l'environnement : PowerShell 5.1 abîme les guillemets dans les arguments des programmes externes
  $env:GARDE_COMMANDE = $commande
  try { & node (Join-Path $Source 'outils\installer-garde.mjs') $Reglages --depuis-env } finally { Remove-Item Env:GARDE_COMMANDE -ErrorAction SilentlyContinue }
  if ($LASTEXITCODE -ne 0) { throw "Installation du garde échouée : settings.json laissé intact." }
  $config = Join-Path $Base 'essaim-garde.json'
  if (-not (Test-Path -LiteralPath $config)) {
    Copy-Item -LiteralPath (Join-Path $Source 'essaim-garde.exemple.json') -Destination $config
    Write-Host "  config     : $config (à adapter : racines d'écriture, commandes interdites)"
  }
}

# 5. Le milieu et les revues ne se commitent pas
if (-not $Global) {
  $gi = Join-Path $Projet '.gitignore'
  $contenu = if (Test-Path -LiteralPath $gi) { [IO.File]::ReadAllText($gi) } else { '' }
  $lignes = $contenu -split "`r?`n"
  foreach ($l in @('_milieu/', '_avocat/')) {
    if ($lignes -notcontains $l) {
      $prefixe = if ($contenu.Length -gt 0 -and -not $contenu.EndsWith("`n")) { "`n" } else { '' }
      [IO.File]::AppendAllText($gi, "$prefixe$l`n", $Utf8)
      $contenu += "$prefixe$l`n"
      Write-Host "  .gitignore : $l"
    }
  }
}

# 6. Vérification
Write-Host "`nTests :" -ForegroundColor Cyan
$tests = Get-ChildItem -LiteralPath (Join-Path $Source 'tests') -Filter '*.test.mjs' | ForEach-Object { $_.FullName }
$sortie = & node --test @tests 2>&1
$sortie | Select-String -Pattern '^# (pass|fail)' | ForEach-Object { Write-Host "  $_" }
if ($LASTEXITCODE -ne 0) {
  $sortie | Select-String -Pattern '^not ok' | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
  Write-Host "  ÉCHEC des tests : installation à vérifier." -ForegroundColor Red
}

# 7. Clé OpenRouter (pour avocat-du-diable) et plafond mensuel
if (-not $env:OPENROUTER_API_KEY -and -not [Environment]::GetEnvironmentVariable('OPENROUTER_API_KEY', 'User')) {
  Write-Host "`nOPENROUTER_API_KEY absente. Pour l'enregistrer (une fois, puis rouvrir le terminal) :" -ForegroundColor Yellow
  Write-Host '  [Environment]::SetEnvironmentVariable("OPENROUTER_API_KEY", "sk-or-...", "User")'
  Write-Host '  [Environment]::SetEnvironmentVariable("AVOCAT_PLAFOND_MOIS_USD", "10", "User")   # plafond mensuel, facultatif'
}
Write-Host "`nTerminé. Dans Claude Code : « essaim » pour qualifier un travail ; « audit Sol », « contredis avec Kimi »... pour un avocat du diable." -ForegroundColor Green
Write-Host "Redémarrer Claude Code pour que le garde soit pris en compte." -ForegroundColor Green
