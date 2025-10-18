$ErrorActionPreference = 'Stop'
$p = "$HOME/.codex/config.toml"
if (-not (Test-Path -LiteralPath $p)) { throw "Config not found: $p" }
$lines = Get-Content -LiteralPath $p
$startLine = ($lines | Select-String -Pattern '^\[mcp_servers\.supabase\]' | Select-Object -First 1)
if (-not $startLine) { Write-Output 'supabase_section_not_found'; exit 0 }
$start = $startLine.LineNumber - 1
$end = [Math]::Min($lines.Length - 1, $start + 10)
$segment = ($lines[$start..$end] -join "`n")
$segment = [regex]::Replace($segment, 'Authorization\s*=\s*"Bearer\s*[^\"]+"', 'Authorization = "Bearer ***"')
$segment = [regex]::Replace($segment, 'apikey\s*=\s*"[^\"]+"', 'apikey = "***"')
Write-Output $segment

