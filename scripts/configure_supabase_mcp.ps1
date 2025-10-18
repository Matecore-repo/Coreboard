$ErrorActionPreference = 'Stop'

param(
  [string]$Token,
  [string]$EnvPath = (Join-Path (Get-Location) '.env'),
  [string]$CodexConfig = "$HOME/.codex/config.toml",
  [string]$CursorConfig = "$HOME/.cursor/mcp.json"
)

function Get-Token {
  param([string]$Given, [string]$EnvPath)
  if ($Given) { return $Given }
  if ($env:SUPABASE_MCP_TOKEN) { return $env:SUPABASE_MCP_TOKEN }
  if (Test-Path -LiteralPath $EnvPath) {
    $lines = Get-Content -LiteralPath $EnvPath
    $line = $lines | Where-Object { $_ -match '^SUPABASE_SERVICE_ROLE' } | Select-Object -First 1
    if ($line) {
      $parts = $line -split '=',2
      if ($parts.Count -ge 2) {
        return $parts[1].Trim().Trim('"')
      }
    }
    $line2 = $lines | Where-Object { $_ -match '^SUPABASE_MCP_TOKEN' } | Select-Object -First 1
    if ($line2) {
      $parts = $line2 -split '=',2
      if ($parts.Count -ge 2) {
        return $parts[1].Trim().Trim('"')
      }
    }
  }
  throw 'No token provided. Pass -Token, set SUPABASE_MCP_TOKEN env, or add SUPABASE_SERVICE_ROLE/SUPABASE_MCP_TOKEN to .env.'
}

$tok = Get-Token -Given $Token -EnvPath $EnvPath
if ([string]::IsNullOrWhiteSpace($tok)) { throw 'Empty token' }

if (Test-Path -LiteralPath $CodexConfig) {
  $cfg = Get-Content -LiteralPath $CodexConfig -Raw
  if ($cfg -notmatch '\[mcp_servers\.supabase\]') { Write-Warning 'Supabase section not found in Codex config'; }
  else {
    $newHeaders = 'headers = { Authorization = "Bearer ' + $tok + '", apikey = "' + $tok + '" }'
    $updated = $false
    $cfg2 = [System.Text.RegularExpressions.Regex]::Replace($cfg, '(?ms)(\[mcp_servers\.supabase\][^\[]*?)headers\s*=\s*\{[^\}]*\}', { param($m) $script:updated = $true; $m.Groups[1].Value + $newHeaders })
    if (-not $script:updated) {
      $cfg2 = [System.Text.RegularExpressions.Regex]::Replace($cfg, '(?ms)(\[mcp_servers\.supabase\][^\[]*?)($)', { param($m) $m.Groups[1].Value + $newHeaders + "`n" })
      $updated = $true
    } else { $updated = $true }
    if ($updated) { Set-Content -LiteralPath $CodexConfig -Value $cfg2 -NoNewline; Write-Output 'Updated Codex config headers.' }
  }
} else { Write-Warning "Codex config not found: $CodexConfig" }

if (Test-Path -LiteralPath $CursorConfig) {
  $json = Get-Content -LiteralPath $CursorConfig -Raw | ConvertFrom-Json
  if (-not $json.mcpServers) { $json | Add-Member -NotePropertyName mcpServers -NotePropertyValue (@{}) }
  if (-not $json.mcpServers.supabase) { $json.mcpServers | Add-Member -NotePropertyName supabase -NotePropertyValue (@{}) }
  if (-not $json.mcpServers.supabase.headers) { $json.mcpServers.supabase | Add-Member -NotePropertyName headers -NotePropertyValue (@{}) }
  $json.mcpServers.supabase.headers.Authorization = "Bearer $tok"
  $json.mcpServers.supabase.headers.apikey = $tok
  $json | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $CursorConfig -NoNewline
  Write-Output 'Updated Cursor config headers.'
} else { Write-Warning "Cursor config not found: $CursorConfig" }

Write-Output 'Done.'

