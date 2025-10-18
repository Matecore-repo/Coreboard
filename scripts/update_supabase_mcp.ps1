param(
  [string]$EnvPath = (Join-Path (Get-Location) '.env'),
  [string]$ConfigPath = "$HOME/.codex/config.toml"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $EnvPath)) {
  throw "Env file not found: $EnvPath"
}

$envLine = Get-Content -LiteralPath $EnvPath | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY' } | Select-Object -First 1
if (-not $envLine) {
  throw 'NEXT_PUBLIC_SUPABASE_ANON_KEY not found in env file'
}

$parts = $envLine -split '=',2
if ($parts.Count -lt 2) { throw 'Malformed NEXT_PUBLIC_SUPABASE_ANON_KEY line' }
$anon = $parts[1].Trim().Trim('"')
if ([string]::IsNullOrWhiteSpace($anon)) { throw 'Empty anon key' }

if (-not (Test-Path -LiteralPath $ConfigPath)) {
  throw "Config file not found: $ConfigPath"
}

$cfg = Get-Content -LiteralPath $ConfigPath -Raw
if ($cfg -notmatch '\[mcp_servers\.supabase\]') {
  throw 'Supabase MCP section not found in config.toml'
}

$newHeaders = 'headers = { Authorization = "Bearer ' + $anon + '", apikey = "' + $anon + '" }'

$script:updated = $false
$cfg = [System.Text.RegularExpressions.Regex]::Replace(
  $cfg,
  '(?ms)(\[mcp_servers\.supabase\][^\[]*?)headers\s*=\s*\{[^\}]*\}',
  { param($m) $script:updated = $true; $m.Groups[1].Value + $newHeaders }
)

if (-not $script:updated) {
  throw 'Headers line not found under Supabase MCP section'
}

Set-Content -LiteralPath $ConfigPath -Value $cfg -NoNewline
Write-Output 'Updated Supabase MCP headers in Codex config.'
