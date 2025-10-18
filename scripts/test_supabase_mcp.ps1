$ErrorActionPreference = 'Stop'

$envPath = (Join-Path (Get-Location) '.env')
if (-not (Test-Path -LiteralPath $envPath)) { throw '.env not found' }

$line = Get-Content -LiteralPath $envPath | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY' } | Select-Object -First 1
if (-not $line) { throw 'anon key not found' }
$parts = $line -split '=',2
$anon = $parts[1].Trim().Trim('"')

$headers = @{ Authorization = ('Bearer ' + $anon); apikey = $anon }
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

