$ErrorActionPreference = 'Stop'
$root = Join-Path (Get-Location) 'src'
if (-not (Test-Path -LiteralPath $root)) { throw "src not found at $root" }
$patterns = @(
  'fetch\(',
  'axios\.',
  'getServerSideProps',
  'getStaticProps',
  'getInitialProps',
  'useSWR\(',
  'react-query',
  'supabase\.'
)
$files = Get-ChildItem -LiteralPath $root -Recurse -File -Force | Where-Object { $_.FullName -notmatch '\\node_modules\\' }
$count = 0
foreach ($f in $files) {
  $text = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction SilentlyContinue
  foreach ($p in $patterns) {
    $matches = [regex]::Matches($text, $p, 'IgnoreCase')
    foreach ($m in $matches) {
      $lineNum = ($text.Substring(0, $m.Index) -split "`n").Count
      Write-Output ("{0}:{1}: {2}" -f $f.FullName, $lineNum, $m.Value)
      $count++
      if ($count -ge 200) { break }
    }
    if ($count -ge 200) { break }
  }
  if ($count -ge 200) { break }
}
if ($count -eq 0) { Write-Output 'no-matches' }

