# Script de configuración automática de Mercado Pago
# Ejecutar desde la raíz del proyecto: .\scripts\setup-mercadopago.ps1

Write-Host "🚀 Configurando Mercado Pago para Coreboard..." -ForegroundColor Cyan

# Verificar si Supabase CLI está instalado
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "⚠️  Supabase CLI no está instalado." -ForegroundColor Yellow
    Write-Host "Instalando Supabase CLI..." -ForegroundColor Yellow
    
    # Intentar instalar usando scoop (método recomendado para Windows)
    $scoopInstalled = Get-Command scoop -ErrorAction SilentlyContinue
    if ($scoopInstalled) {
        scoop install supabase
    } else {
        Write-Host "❌ Por favor instala Supabase CLI manualmente:" -ForegroundColor Red
        Write-Host "   https://github.com/supabase/cli#install-the-cli" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "O usa: scoop install supabase" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Supabase CLI instalado" -ForegroundColor Green

# Verificar login
Write-Host ""
Write-Host "📋 Verificando login en Supabase..." -ForegroundColor Cyan
$loggedIn = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No estás logueado en Supabase." -ForegroundColor Yellow
    Write-Host "Ejecutando: supabase login" -ForegroundColor Yellow
    supabase login
}

# Link proyecto
Write-Host ""
Write-Host "🔗 Enlazando proyecto..." -ForegroundColor Cyan
supabase link --project-ref hawpywnmkatwlcbtffrg

# Configurar secrets
Write-Host ""
Write-Host "🔐 Configurando secrets en Supabase..." -ForegroundColor Cyan

$secrets = @{
    "MP_CLIENT_ID" = "311317450627289"
    "MP_CLIENT_SECRET" = "ACAOfFSl4KkULdcRE6WlUUHMNwmqrVvq"
    "MP_WEBHOOK_SECRET" = "903fdd0640d1353e6ba6a9051798e93efd4ef39054a1699c2dc577511217dc5d"
    "MP_TOKEN_KEY" = "f9d2b8a0e1c4b39f772c5a6d84f09e3b51a27cb08e6d9354a7dcb61f92ad4b03"
    "PUBLIC_EDGE_BASE_URL" = "https://hawpywnmkatwlcbtffrg.supabase.co"
    "NEXT_PUBLIC_APP_URL" = "https://coreboard.vercel.app"
}

foreach ($key in $secrets.Keys) {
    Write-Host "  Configurando $key..." -ForegroundColor Gray
    $value = $secrets[$key]
    supabase secrets set "$key=$value"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $key configurado" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Error configurando $key" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "⚠️  IMPORTANTE: Configura SUPABASE_SERVICE_ROLE_KEY manualmente:" -ForegroundColor Yellow
Write-Host "   1. Ve a: https://supabase.com/dashboard/project/hawpywnmkatwlcbtffrg/settings/api" -ForegroundColor Cyan
Write-Host "   2. Copia el 'service_role' key (secret)" -ForegroundColor Cyan
Write-Host "   3. Ejecuta: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=tu_key_aqui" -ForegroundColor Cyan

# Desplegar Edge Functions
Write-Host ""
Write-Host "📦 Desplegando Edge Functions..." -ForegroundColor Cyan

$functions = @(
    "auth-mp-connect",
    "auth-mp-callback",
    "mp-token-refresh",
    "mp-disconnect",
    "mp-create-preference",
    "mercadopago-webhook",
    "create-payment-link",
    "get-payment-link-config",
    "public-get-salon-services",
    "public-get-salon-stylists",
    "public-get-availability",
    "public-create-appointment"
)

foreach ($func in $functions) {
    Write-Host "  Desplegando $func..." -ForegroundColor Gray
    supabase functions deploy $func
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $func desplegada" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Error desplegando $func" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Configura SUPABASE_SERVICE_ROLE_KEY (ver arriba)" -ForegroundColor Yellow
Write-Host "   2. Crea .env.local con las variables de entorno (ver docs/MERCADOPAGO_TESTING.md)" -ForegroundColor Yellow
Write-Host "   3. Configura webhook en Mercado Pago dashboard" -ForegroundColor Yellow
Write-Host "   4. Prueba el flujo OAuth desde el CRM" -ForegroundColor Yellow

