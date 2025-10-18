param([int]$Port = 3000)
$ErrorActionPreference = 'Stop'
$conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $conns) { Write-Output "No process is listening on port $Port"; exit 0 }
$pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($pid in $pids) {
  try {
    $p = Get-Process -Id $pid -ErrorAction Stop
    Write-Output ("Killing PID {0} ({1}) on port {2}" -f $pid,$p.ProcessName,$Port)
    Stop-Process -Id $pid -Force -ErrorAction Stop
  } catch {
    Write-Warning "Failed to kill PID $pid: $_"
  }
}
Write-Output "Done."

