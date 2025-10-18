$ErrorActionPreference = 'Stop'
$p = "$HOME/.cursor/mcp.json"
if (-not (Test-Path -LiteralPath $p)) { throw "mcp.json not found: $p" }
$raw = Get-Content -LiteralPath $p -Raw
$raw = [regex]::Replace($raw, '("GITHUB_PERSONAL_ACCESS_TOKEN"\s*:\s*")([^"]+)(")', '$1***$3')
$raw = [regex]::Replace($raw, '("Authorization"\s*:\s*"Bearer\s*)([^"]+)(")', '$1***$3')
$raw = [regex]::Replace($raw, '("apikey"\s*:\s*")([^"]+)(")', '$1***$3')
Write-Output $raw

