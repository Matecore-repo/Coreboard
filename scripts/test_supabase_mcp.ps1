$ErrorActionPreference = 'Stop'

$token = $env:SUPABASE_MCP_TOKEN
if (-not $token) {
  $envPath = (Join-Path (Get-Location) '.env')
  if (Test-Path -LiteralPath $envPath) {
    $lines = Get-Content -LiteralPath $envPath
    $line = $lines | Where-Object { $_ -match '^SUPABASE_SERVICE_ROLE' } | Select-Object -First 1
    if ($line) { $token = ($line -split '=',2)[1].Trim().Trim('"') }
    if (-not $token) {
      $line2 = $lines | Where-Object { $_ -match '^SUPABASE_MCP_TOKEN' } | Select-Object -First 1
      if ($line2) { $token = ($line2 -split '=',2)[1].Trim().Trim('"') }
    }
  }
}
if (-not $token) { throw 'No token: set SUPABASE_MCP_TOKEN or add SUPABASE_SERVICE_ROLE/SUPABASE_MCP_TOKEN to .env' }

$headers = @{ Authorization = ('Bearer ' + $token); apikey = $token }
try {
  $r = Invoke-WebRequest -Uri 'https://mcp.supabase.com/mcp?project_ref=hawpywnmkatwlcbtffrg' -Method Head -TimeoutSec 20 -Headers $headers
  Write-Output ("status:" + $r.StatusCode)
} catch {
  if ($_.Exception.Response) {
    Write-Output ("status:" + [int]$_.Exception.Response.StatusCode)
  } else {
    Write-Output ("status:error " + $_.Exception.Message)
  }
}
