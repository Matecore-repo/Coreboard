# Script para crear .env.local
# Ejecutar desde la raíz del proyecto: .\scripts\create-env-local.ps1

$envContent = @"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhhd3B5d25ta2F0d2xjYnRmZnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDU1MDYsImV4cCI6MjA3NDgyMTUwNn0.Rp8cwqKsq6dxP6Yb8H5movLCgDWK-Cd6dJ2rF6kFnLs"
NEXT_PUBLIC_SUPABASE_URL="https://hawpywnmkatwlcbtffrg.supabase.co"
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL="https://hawpywnmkatwlcbtffrg.supabase.co/functions/v1"
NEXT_PUBLIC_APP_URL="https://coreboard.vercel.app"
MP_TEST_PUBLIC_KEY="TEST-0ca3aa64-6280-4f79-b276-b96ab1e3f561"
"@

$envPath = Join-Path $PSScriptRoot ".." ".env.local"
$envPath = Resolve-Path $envPath -ErrorAction SilentlyContinue

if (-not $envPath) {
    $envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local"
}

if (Test-Path $envPath) {
    Write-Host "⚠️  .env.local ya existe. ¿Deseas sobrescribirlo? (S/N)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -ne "S" -and $response -ne "s") {
        Write-Host "❌ Cancelado." -ForegroundColor Red
        exit 0
    }
}

Write-Host "📝 Creando .env.local..." -ForegroundColor Cyan
$envContent | Out-File -FilePath $envPath -Encoding utf8 -NoNewline
Write-Host "✅ .env.local creado en: $envPath" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Contenido:" -ForegroundColor Cyan
Write-Host $envContent

