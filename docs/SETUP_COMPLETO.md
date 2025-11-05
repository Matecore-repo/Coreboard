# Configuración Completa de Mercado Pago - Resumen

## ✅ Estado Actual - TODO COMPLETADO

### Configuración Automática Completada

1. ✅ **Tabla `payment_links` creada** vía MCP de Supabase
   - Migración aplicada
   - Estructura completa con índices
   - Políticas RLS configuradas

2. ✅ **Archivo `.env.local` creado**
   - Script ejecutado: `scripts/create-env-local.ps1`
   - Todas las variables de entorno configuradas

3. ✅ **7 Secrets configurados en Supabase:**
   - `MP_CLIENT_ID`
   - `MP_CLIENT_SECRET`
   - `MP_WEBHOOK_SECRET`
   - `MP_TOKEN_KEY`
   - `PUBLIC_EDGE_BASE_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `SERVICE_ROLE_KEY`

4. ✅ **11 Edge Functions desplegadas:**
   - `auth-mp-connect`
   - `auth-mp-callback`
   - `mp-disconnect`
   - `mp-create-preference`
   - `mercadopago-webhook`
   - `create-payment-link`
   - `get-payment-link-config`
   - `public-get-salon-services`
   - `public-get-salon-stylists`
   - `public-get-availability`
   - `public-create-appointment`

5. ✅ **Webhook configurado en Mercado Pago** (modo prueba)
   - URL: `https://hawpywnmkatwlcbtffrg.supabase.co/functions/v1/mercadopago-webhook`
   - Eventos configurados: Pagos, Vinculación, Alertas, Reclamos, Card Updater, Contracargos, Order, Órdenes comerciales
   - Clave secreta configurada

---

## Configuración Actual (Sandbox/Prueba)

### Secrets en Supabase (Modo Prueba)

```env
MP_CLIENT_ID=311317450627289
MP_CLIENT_SECRET=ACAOfFSl4KkULdcRE6WlUUHMNwmqrVvq
MP_WEBHOOK_SECRET=903fdd0640d1353e6ba6a9051798e93efd4ef39054a1699c2dc577511217dc5d
MP_TOKEN_KEY=f9d2b8a0e1c4b39f772c5a6d84f09e3b51a27cb08e6d9354a7dcb61f92ad4b03
PUBLIC_EDGE_BASE_URL=https://hawpywnmkatwlcbtffrg.supabase.co
NEXT_PUBLIC_APP_URL=https://coreboard.vercel.app
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Variables en `.env.local` (Frontend)

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
NEXT_PUBLIC_SUPABASE_URL="https://hawpywnmkatwlcbtffrg.supabase.co"
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL="https://hawpywnmkatwlcbtffrg.supabase.co/functions/v1"
NEXT_PUBLIC_APP_URL="https://coreboard.vercel.app"
MP_TEST_PUBLIC_KEY="TEST-0ca3aa64-6280-4f79-b276-b96ab1e3f561"
```

---

## Testing End-to-End

### Guía Completa de Testing

Ver `MERCADOPAGO_TESTING.md` para:
- ✅ Paso 1: Verificar Conexión OAuth
- ✅ Paso 2: Generar Payment Link
- ✅ Paso 3: Probar Checkout Público (Flujo Completo)
- ✅ Paso 4: Verificar Webhook
- ✅ Paso 5: Probar Casos Edge

**Resumen rápido:**
1. CRM → Configuración → Mercado Pago → Conectar (cuenta: `TESTUSER5830222553060724396`)
2. CRM → Generar Link de Pago → Copiar link
3. Abrir link en modo incógnito → Completar checkout → Pagar con tarjeta `5031 7557 3453 0604`
4. Verificar redirección a `/payment/success` y turno confirmado en BD

---

## Preparación para Producción

### Checklist Pre-Producción

Antes de pasar a producción, asegúrate de:

- [ ] **Testing completo realizado** (ver `MERCADOPAGO_TESTING.md`)
- [ ] **Credenciales de producción obtenidas** de Mercado Pago
- [ ] **Variables de entorno actualizadas** (ver sección abajo)
- [ ] **Webhooks configurados en producción** (modo productivo)
- [ ] **Monitoreo configurado** (logs, alertas)
- [ ] **Documentación actualizada** para el equipo

---

## Migración de Prueba a Producción

### Paso 1: Obtener Credenciales de Producción

1. **Ir a Mercado Pago Dashboard:**
   - https://www.mercadopago.com.ar/developers/panel/app/311317450627289/credentials/production
   - Solicitar credenciales de producción (si no las tienes)

2. **Copiar Credenciales:**
   - **Client ID** (producción)
   - **Client Secret** (producción)
   - **Public Key** (producción)
   - **Access Token** (producción) - opcional, se genera vía OAuth

3. **Generar Nueva Clave Secreta para Webhook:**
   - Dashboard → Webhooks → Generar nueva clave secreta
   - Guardar en lugar seguro (no reutilizar la de prueba)

---

### Paso 2: Actualizar Secrets en Supabase

**⚠️ IMPORTANTE:** Actualizar todos los secrets con valores de producción.

```bash
# 1. Actualizar MP_CLIENT_ID (producción)
supabase secrets set MP_CLIENT_ID=[PRODUCTION_CLIENT_ID] --project-ref hawpywnmkatwlcbtffrg

# 2. Actualizar MP_CLIENT_SECRET (producción)
supabase secrets set MP_CLIENT_SECRET=[PRODUCTION_CLIENT_SECRET] --project-ref hawpywnmkatwlcbtffrg

# 3. Actualizar MP_WEBHOOK_SECRET (nueva clave de producción)
supabase secrets set MP_WEBHOOK_SECRET=[PRODUCTION_WEBHOOK_SECRET] --project-ref hawpywnmkatwlcbtffrg

# 4. Actualizar MP_TOKEN_KEY (producción)
supabase secrets set MP_TOKEN_KEY=[PRODUCTION_TOKEN_KEY] --project-ref hawpywnmkatwlcbtffrg

# 5. Verificar URLs (deben ser las de producción)
supabase secrets set PUBLIC_EDGE_BASE_URL=https://hawpywnmkatwlcbtffrg.supabase.co --project-ref hawpywnmkatwlcbtffrg
supabase secrets set NEXT_PUBLIC_APP_URL=https://coreboard.vercel.app --project-ref hawpywnmkatwlcbtffrg

# 6. SERVICE_ROLE_KEY no cambia (es el mismo)
```

**Verificar que se actualizaron:**
```bash
supabase secrets list --project-ref hawpywnmkatwlcbtffrg
```

---

### Paso 3: Actualizar Variables en Frontend

**Actualizar `.env.local` y variables en Vercel/plataforma de hosting:**

```env
# .env.local (producción)
NEXT_PUBLIC_SUPABASE_ANON_KEY="[PRODUCTION_ANON_KEY]"  # Mismo que ahora
NEXT_PUBLIC_SUPABASE_URL="https://hawpywnmkatwlcbtffrg.supabase.co"  # Mismo
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL="https://hawpywnmkatwlcbtffrg.supabase.co/functions/v1"  # Mismo
NEXT_PUBLIC_APP_URL="https://coreboard.vercel.app"  # URL de producción
MP_TEST_PUBLIC_KEY="[PRODUCTION_PUBLIC_KEY]"  # ⚠️ Cambiar a producción
```

**En Vercel:**
1. Ir a Settings → Environment Variables
2. Actualizar todas las variables con valores de producción
3. Redeployar aplicación

---

### Paso 4: Configurar Webhook en Producción

1. **Ir a Mercado Pago Dashboard:**
   - https://www.mercadopago.com.ar/developers/panel/app/311317450627289/webhooks
   - Cambiar tab a **"Modo productivo"**

2. **Configurar Webhook:**
   - URL: `https://hawpywnmkatwlcbtffrg.supabase.co/functions/v1/mercadopago-webhook`
   - Seleccionar eventos:
     - ✅ `payment`
     - ✅ `mp-connect`
     - ✅ `order`
     - ✅ `merchant_order`
     - ✅ Otros eventos según necesidad
   - **Clave secreta:** Usar la nueva clave secreta de producción
   - Guardar configuración

3. **Verificar Webhook:**
   - Usar herramienta "Simular notificación" con un pago real de prueba pequeño
   - Verificar que llega correctamente a la Edge Function

---

### Paso 5: Actualizar Código (Si es Necesario)

**Revisar Edge Functions que usan credenciales:**

1. **`mp-create-preference/index.ts`:**
   - Verificar que usa `MP_TOKEN_KEY` correctamente
   - No hay hardcodeo de credenciales de prueba

2. **`mercadopago-webhook/index.ts`:**
   - Verificar que valida `MP_WEBHOOK_SECRET` correctamente
   - Usa la clave secreta del environment

3. **Frontend:**
   - Verificar que usa `MP_TEST_PUBLIC_KEY` desde env (no hardcodeado)
   - Cambiar a `MP_PUBLIC_KEY` en producción si es necesario

---

### Paso 6: Testing Final en Producción

**⚠️ Hacer pruebas con montos pequeños antes de lanzar completamente**

1. **Probar OAuth en Producción:**
   - CRM → Configuración → Mercado Pago → Conectar
   - Usar cuenta real de Mercado Pago (no test)
   - Verificar que se conecta correctamente

2. **Generar Payment Link:**
   - CRM → Generar Link de Pago
   - Verificar que genera link correctamente

3. **Probar Checkout con Pago Real (Monto Mínimo):**
   - Abrir link en modo incógnito
   - Completar checkout
   - Pagar con tarjeta real (monto mínimo: $1 ARS)
   - Verificar que:
     - Pago se procesa correctamente
     - Webhook llega
     - Turno se confirma
     - Notificación se envía

4. **Verificar Logs:**
   - Supabase → Edge Functions → Logs
   - Verificar que no hay errores
   - Verificar que webhooks se procesan correctamente

---

## Checklist Final de Producción

### Antes de Lanzar

- [ ] ✅ Credenciales de producción configuradas en Supabase
- [ ] ✅ Variables de entorno actualizadas en frontend
- [ ] ✅ Webhook configurado en modo productivo
- [ ] ✅ OAuth probado con cuenta real
- [ ] ✅ Payment link generado correctamente
- [ ] ✅ Checkout completo probado con pago real (monto mínimo)
- [ ] ✅ Webhook procesa correctamente
- [ ] ✅ Turnos se confirman automáticamente
- [ ] ✅ Logs monitoreados y sin errores
- [ ] ✅ Documentación actualizada

### Post-Lanzamiento

- [ ] Monitorear logs diariamente primera semana
- [ ] Verificar tasa de éxito de pagos
- [ ] Verificar que webhooks llegan correctamente
- [ ] Revisar errores y ajustar según necesidad

---

## Diferencias Clave: Prueba vs Producción

| Aspecto | Prueba (Sandbox) | Producción |
|---------|------------------|------------|
| **Client ID** | `311317450627289` | [PRODUCTION_CLIENT_ID] |
| **Client Secret** | `ACAOfFSl...` | [PRODUCTION_SECRET] |
| **Webhook Secret** | `903fdd06...` | [NUEVA_CLAVE_PRODUCCION] |
| **Token Key** | `f9d2b8a0...` | [PRODUCTION_TOKEN_KEY] |
| **Public Key** | `TEST-0ca3aa64...` | [PRODUCTION_PUBLIC_KEY] |
| **API URL** | `https://api.mercadopago.com` | `https://api.mercadopago.com` (mismo) |
| **Cuentas** | TESTUSER* | Cuentas reales |
| **Pagos** | Tarjetas de prueba | Tarjetas reales |
| **Webhook URL** | Mismo | Mismo (misma Edge Function) |

---

## Rollback Plan

Si algo sale mal en producción:

1. **Revertir Secrets:**
   ```bash
   supabase secrets set MP_CLIENT_ID=311317450627289 --project-ref hawpywnmkatwlcbtffrg
   supabase secrets set MP_CLIENT_SECRET=ACAOfFSl4KkULdcRE6WlUUHMNwmqrVvq --project-ref hawpywnmkatwlcbtffrg
   # ... (revertir todos a valores de prueba)
   ```

2. **Revertir Variables en Frontend:**
   - Vercel → Environment Variables → Revertir a valores de prueba
   - Redeployar

3. **Cambiar Webhook a Modo Prueba:**
   - Mercado Pago Dashboard → Webhooks → Cambiar a modo prueba

---

## Monitoreo y Alertas

### Métricas a Monitorear

1. **Tasa de Éxito de OAuth:**
   - Verificar que los usuarios pueden conectar sus cuentas
   - Monitorear errores en `auth-mp-connect` y `auth-mp-callback`

2. **Tasa de Generación de Payment Links:**
   - Verificar que se generan correctamente
   - Monitorear errores en `create-payment-link`

3. **Tasa de Conversión de Checkout:**
   - Visitas a payment links vs pagos completados
   - Monitorear errores en `public-create-appointment`

4. **Tasa de Éxito de Pagos:**
   - Pagos aprobados vs rechazados
   - Monitorear webhooks recibidos vs procesados

5. **Tiempo de Respuesta:**
   - Edge Functions deben responder < 2 segundos
   - Webhooks deben procesarse < 5 segundos

### Alertas Recomendadas

- ❌ Error rate > 5% en cualquier Edge Function
- ❌ Webhook no recibido por > 10 minutos
- ❌ Tiempo de respuesta > 5 segundos
- ❌ Tasa de éxito de pagos < 80%

---

## Documentación Adicional

- **Testing Completo:** Ver `MERCADOPAGO_TESTING.md`
- **Troubleshooting:** Ver sección de troubleshooting en `MERCADOPAGO_TESTING.md`
- **API Docs:** https://www.mercadopago.com.ar/developers/es/docs
- **Supabase Docs:** https://supabase.com/docs

---

**Última actualización:** Configuración completada ✅ - Listo para producción después de testing completo
