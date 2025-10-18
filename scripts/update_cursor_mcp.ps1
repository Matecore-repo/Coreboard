$ErrorActionPreference = 'Stop'

$envPath = (Join-Path (Get-Location) '.env')
if (-not (Test-Path -LiteralPath $envPath)) { throw '.env not found' }
$line = Get-Content -LiteralPath $envPath | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY' } | Select-Object -First 1
if (-not $line) { throw 'anon key not found' }
$parts = $line -split '=',2
$anon = $parts[1].Trim().Trim('"')

$jsonPath = "$HOME/.cursor/mcp.json"
if (-not (Test-Path -LiteralPath $jsonPath)) { throw "mcp.json not found: $jsonPath" }
$json = Get-Content -LiteralPath $jsonPath -Raw | ConvertFrom-Json

if (-not $json.mcpServers) { throw 'mcpServers missing in mcp.json' }
if (-not $json.mcpServers.supabase) { throw 'supabase server missing in mcp.json' }
if (-not $json.mcpServers.supabase.headers) { $json.mcpServers.supabase | Add-Member -NotePropertyName headers -NotePropertyValue (@{}) }

$headers = $json.mcpServers.supabase.headers
if ($headers -is [hashtable]) {
  $headers['Authorization'] = "Bearer $anon"
  $headers['apikey'] = $anon
} else {
  $headers | Add-Member -NotePropertyName Authorization -NotePropertyValue ("Bearer $anon") -Force
  $headers | Add-Member -NotePropertyName apikey -NotePropertyValue $anon -Force
}

$json | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $jsonPath -NoNewline
Write-Output 'Updated Cursor MCP supabase headers.'
