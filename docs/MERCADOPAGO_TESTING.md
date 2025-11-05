# Guía Completa de Testing - Mercado Pago

## ✅ Estado Actual - TODO COMPLETADO

### Configuración Completada

- ✅ **Tabla `app.payment_links`** creada (migración aplicada vía MCP)
- ✅ **Tabla `app.mercadopago_credentials`** existe
- ✅ **Tabla `app.mp_payments`** existe
- ✅ **7 Secrets configurados** en Supabase:
  - `MP_CLIENT_ID`
  - `MP_CLIENT_SECRET`
  - `MP_WEBHOOK_SECRET`
  - `MP_TOKEN_KEY`
  - `PUBLIC_EDGE_BASE_URL`
  - `NEXT_PUBLIC_APP_URL`
  - `SERVICE_ROLE_KEY`
- ✅ **11 Edge Functions actualizadas y desplegadas**:
  - `auth-mp-connect` ✅ Actualizada
  - `public-auth-mp-callback` ✅ Renombrada y actualizada
  - `mp-disconnect` ✅
  - `mp-create-preference` ✅
  - `mercadopago-webhook` ✅
  - `create-payment-link` ✅
  - `get-payment-link-config` ✅ **Actualizada y desplegada - Requiere Google Auth**
  - `public-get-salon-services` ✅ **Actualizada y desplegada - Requiere Google Auth**
  - `public-get-salon-stylists` ✅ **Actualizada y desplegada - Requiere Google Auth**
  - `public-get-availability` ✅ **Actualizada y desplegada - Requiere Google Auth**
  - `public-create-appointment` ✅ **Actualizada y desplegada - Requiere Google Auth**
- ✅ **Archivo `.env.local`** creado con todas las variables
- ✅ **Webhook configurado en Mercado Pago** (modo prueba):
  - URL: `https://hawpywnmkatwlcbtffrg.supabase.co/functions/v1/mercadopago-webhook`
  - Eventos: Pagos, Vinculación de aplicaciones, Alertas de fraude, Reclamos, Card Updater, Contracargos, Order, Órdenes comerciales
  - Clave secreta configurada
- ✅ **Autenticación con Google OAuth implementada**:
  - ✅ Página de checkout requiere autenticación con Google
  - ✅ Callback redirige automáticamente al checkout después de autenticarse
  - ✅ Hook `usePublicCheckout` envía token de autenticación en todas las requests
  - ✅ Edge Functions públicas requieren header `Authorization: Bearer <token>`

---

## Credenciales de Prueba

### Cuentas Test
- **Vendedor:** `TESTUSER5830222553060724396` / `yCM6rFsIDZ`
- **Comprador:** `TESTUSER3530837555863106944` / `mslnqrN49W`

### API Credentials (Sandbox)
```env
MP_CLIENT_ID=311317450627289
MP_CLIENT_SECRET=ACAOfFSl4KkULdcRE6WlUUHMNwmqrVvq
MP_WEBHOOK_SECRET=903fdd0640d1353e6ba6a9051798e93efd4ef39054a1699c2dc577511217dc5d
MP_TOKEN_KEY=f9d2b8a0e1c4b39f772c5a6d84f09e3b51a27cb08e6d9354a7dcb61f92ad4b03
```

### Tarjetas de Prueba
- **Aprobada:** `5031 7557 3453 0604` (CVV: 123, Fecha: 11/25)
- **Rechazada:** `5031 4332 1540 6351` (CVV: 123, Fecha: 11/25)
- **Pendiente:** `5031 7557 3453 0604` (CVV: 123, Fecha: 11/25) - Para pagos con revisión manual

---

## ✅ Cambios Implementados: Autenticación con Google OAuth

### Resumen de Cambios

1. **Página de Checkout (`pages/book/[token].tsx`)**:
   - ✅ Requiere autenticación con Google antes de mostrar el checkout
   - ✅ Muestra botón "Continuar con Google" si no hay sesión
   - ✅ Guarda el token del payment link en sessionStorage para redirigir después de la autenticación

2. **Callback de Autenticación (`pages/auth/callback.tsx`)**:
   - ✅ Detecta si hay un token de payment link pendiente
   - ✅ Redirige automáticamente al checkout después de autenticarse con Google

3. **Hook `usePublicCheckout` (`src/hooks/usePublicCheckout.ts`)**:
   - ✅ Obtiene el token de sesión de Supabase
   - ✅ Envía el token en el header `Authorization: Bearer <token>` en todas las requests a las Edge Functions

4. **Edge Functions Públicas**:
   - ✅ `get-payment-link-config`: Requiere header de autorización
   - ✅ `public-get-salon-services`: Requiere header de autorización
   - ✅ `public-get-salon-stylists`: Requiere header de autorización
   - ✅ `public-get-availability`: Requiere header de autorización
   - ✅ `public-create-appointment`: Requiere header de autorización

5. **Exportación de `getClient`**:
   - ✅ Exportado desde `src/lib/supabase.ts` para usar en el hook

### ✅ Despliegue de Edge Functions Completado

Las Edge Functions han sido actualizadas y desplegadas exitosamente:

- ✅ `get-payment-link-config` - Desplegada
- ✅ `public-get-salon-services` - Desplegada
- ✅ `public-get-salon-stylists` - Desplegada
- ✅ `public-get-availability` - Desplegada
- ✅ `public-create-appointment` - Desplegada

**Dashboard de Supabase:** https://supabase.com/dashboard/project/hawpywnmkatwlcbtffrg/functions

---

## Testing End-to-End Completo

### Flujo Completo de Testing (5 Pasos)

#### Paso 1: Verificar Conexión OAuth ✅

**Objetivo:** Verificar que la integración OAuth funciona correctamente.

1. **Abrir CRM:**
   - Ir a `https://coreboard.vercel.app` (o localhost si está corriendo)
   - Login con cuenta de organización

2. **Navegar a Configuración:**
   - CRM → Configuración → Mercado Pago
   - Click en "Conectar con Mercado Pago"

3. **Completar OAuth:**
   - Será redirigido a Mercado Pago
   - **Login con cuenta vendedor:** `TESTUSER5830222553060724396` / `yCM6rFsIDZ`
   - Autorizar la aplicación
   - Será redirigido de vuelta al CRM

4. **Verificar Estado:**
   - Debe mostrar "Conectado" en lugar de "Conectar"
   - Verificar en BD: `SELECT * FROM app.mercadopago_credentials WHERE org_id = 'tu_org_id'`
   - Debe existir un registro con `access_token` y `refresh_token`

**✅ Verificación Exitosa:**
- Estado muestra "Conectado"
- Credenciales guardadas en BD
- Token de acceso válido

---

#### Paso 2: Generar Payment Link ✅

**Objetivo:** Verificar que la generación de payment links funciona.

1. **Abrir Modal de Payment Link:**
   - CRM → Click en botón "Generar Link de Pago" (o donde esté disponible)
   - Se abre modal `PaymentLinkModal`

2. **Completar Formulario:**
   - Seleccionar **Salón** (requerido)
   - Ingresar **Título** (ej: "Reserva tu turno")
   - Ingresar **Descripción** (opcional)
   - Click en "Generar Link"

3. **Verificar Resultado:**
   - Debe aparecer un link: `https://coreboard.vercel.app/book/[token]`
   - El token debe ser una cadena hexadecimal de 64 caracteres
   - Click en "Copiar" debe copiar el link al portapapeles

4. **Verificar en BD:**
   ```sql
   SELECT * FROM app.payment_links 
   WHERE org_id = 'tu_org_id' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - Debe existir un registro con `token_hash`, `title`, `active = true`
   - `expires_at` debe ser ~30 días en el futuro

**✅ Verificación Exitosa:**
- Link generado correctamente
- Token único y válido
- Registro creado en BD
- Link copiable

---

#### Paso 3: Probar Checkout Público (Flujo Completo) ✅

**Objetivo:** Verificar que el checkout público funciona end-to-end.

1. **Abrir Payment Link:**
   - Abrir el link generado en **modo incógnito** (navegador privado)
   - URL: `https://coreboard.vercel.app/book/[token]`
   - Debe cargar la página de checkout público

2. **Completar Stepper Paso a Paso:**

   **Paso 1: Seleccionar Servicio**
   - Debe mostrar lista de servicios del salón
   - Seleccionar un servicio (ej: "Corte de cabello")
   - Click en "Siguiente"

   **Paso 2: Seleccionar Estilista**
   - Debe mostrar lista de estilistas disponibles
   - Seleccionar un estilista (o "Cualquiera")
   - Click en "Siguiente"

   **Paso 3: Seleccionar Fecha**
   - Debe mostrar calendario con fechas disponibles
   - Seleccionar una fecha futura
   - Click en "Siguiente"

   **Paso 4: Seleccionar Hora**
   - Debe mostrar horarios disponibles para la fecha seleccionada
   - Seleccionar un horario (ej: "10:00")
   - Click en "Siguiente"

   **Paso 5: Completar Datos**
   - Ingresar **Nombre del cliente** (requerido)
   - Ingresar **Teléfono** (opcional)
   - Ingresar **Email** (opcional)
   - Click en "Confirmar y Pagar"

3. **Verificar Redirección a Mercado Pago:**
   - Debe redirigir a checkout de Mercado Pago
   - URL debe ser de Mercado Pago (sandbox)
   - Debe mostrar el monto del servicio

4. **Completar Pago:**
   - Seleccionar "Tarjeta de crédito"
   - Ingresar tarjeta de prueba: `5031 7557 3453 0604`
   - CVV: `123`
   - Fecha: `11/25`
   - Nombre: `APRO`
   - Click en "Pagar"

5. **Verificar Redirección:**
   - Debe redirigir a `/payment/success?appointment_id=[id]`
   - Debe mostrar mensaje de éxito
   - El turno debe estar confirmado en BD

**✅ Verificación Exitosa:**
- Checkout carga correctamente
- Todos los pasos del stepper funcionan
- Redirección a Mercado Pago funciona
- Pago se procesa correctamente
- Turno se crea y confirma en BD

---

#### Paso 4: Verificar Webhook ✅

**Objetivo:** Verificar que los webhooks de Mercado Pago se procesan correctamente.

1. **Revisar Logs de Edge Function:**
   - Ir a Supabase Dashboard → Edge Functions → `mercadopago-webhook` → Logs
   - Debe haber logs de notificaciones recibidas

2. **Verificar en BD:**
   ```sql
   -- Verificar turno confirmado
   SELECT * FROM app.appointments 
   WHERE id = 'appointment_id_del_pago'
   AND status = 'confirmed';
   
   -- Verificar registro de pago
   SELECT * FROM app.mp_payments 
   WHERE appointment_id = 'appointment_id_del_pago'
   ORDER BY created_at DESC;
   ```

3. **Simular Webhook Manualmente (Opcional):**
   - Ir a Mercado Pago Dashboard → Webhooks → "Simular notificación"
   - Seleccionar evento: `payment`
   - Data ID: ID del pago de prueba
   - Click en "Enviar prueba"
   - Verificar que llega al webhook

**✅ Verificación Exitosa:**
- Webhooks se reciben correctamente
- Turnos se confirman automáticamente
- Pagos se registran en BD

---

#### Paso 5: Probar Casos Edge ✅

**Objetivo:** Verificar casos límite y errores.

1. **Payment Link Expirado:**
   - Crear link con fecha de expiración pasada
   - Intentar acceder → Debe mostrar error "Link expirado"

2. **Payment Link Inactivo:**
   - Desactivar link en BD: `UPDATE app.payment_links SET active = false WHERE token_hash = '...'`
   - Intentar acceder → Debe mostrar error "Link no disponible"

3. **Pago Rechazado:**
   - Completar checkout hasta pago
   - Usar tarjeta rechazada: `5031 4332 1540 6351`
   - Debe redirigir a `/payment/failure`
   - Turno debe quedar en estado `pending` o `cancelled`

4. **Sin Servicios Disponibles:**
   - Desactivar todos los servicios del salón
   - Intentar acceder al link → Debe mostrar mensaje apropiado

5. **Sin Horarios Disponibles:**
   - Seleccionar fecha sin horarios disponibles
   - Debe mostrar mensaje "No hay horarios disponibles"

**✅ Verificación Exitosa:**
- Todos los casos edge se manejan correctamente
- Mensajes de error apropiados
- No hay crashes o errores 500

---

## Verificación Post-Testing

### Checklist de Verificación

```bash
# 1. Verificar Edge Functions desplegadas
supabase functions list --project-ref hawpywnmkatwlcbtffrg

# 2. Verificar secrets configurados
supabase secrets list --project-ref hawpywnmkatwlcbtffrg

# 3. Verificar tablas en BD (ejecutar en Supabase SQL Editor)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'app' 
AND table_name IN ('mercadopago_credentials', 'mp_payments', 'payment_links');

# 4. Verificar registros creados
SELECT COUNT(*) FROM app.mercadopago_credentials;
SELECT COUNT(*) FROM app.payment_links;
SELECT COUNT(*) FROM app.mp_payments;
```

---

## Troubleshooting

| Error | Causa Probable | Solución |
|-------|---------------|----------|
| "No hay cuenta conectada" | OAuth no completado | Completar OAuth desde CRM |
| "Token inválido" | Payment link no existe o expirado | Verificar en BD: `SELECT * FROM app.payment_links WHERE token_hash = '...'` |
| "Webhook no llega" | URL incorrecta o secreto incorrecto | Verificar URL en MP dashboard y `MP_WEBHOOK_SECRET` |
| "Edge Function no encontrada" | Función no desplegada | Desplegar con `supabase functions deploy [nombre]` |
| "Error creando preferencia" | Token de acceso inválido | Verificar que OAuth está completo y token no expiró |
| "Turno no se confirma" | Webhook no procesa correctamente | Revisar logs de `mercadopago-webhook` en Supabase |

---

## Logs y Monitoreo

### Ver Logs de Edge Functions

1. **Supabase Dashboard:**
   - Edge Functions → Seleccionar función → Logs
   - Filtrar por fecha/hora

2. **Mercado Pago Dashboard:**
   - Webhooks → Ver historial de notificaciones
   - Verificar estado de entrega (éxito/fallo)

### Métricas a Monitorear

- ✅ Tasa de éxito de OAuth
- ✅ Tasa de generación de payment links
- ✅ Tasa de conversión de checkout (visitas → pagos)
- ✅ Tiempo de respuesta de webhooks
- ✅ Tasa de éxito de pagos

---

## Testing en Producción (Preparación)

Ver sección **"Preparación para Producción"** en `SETUP_COMPLETO.md` para:
- Cambio de credenciales de prueba a producción
- Configuración de webhooks en producción
- Testing final antes de lanzar

---

**Última actualización:** Configuración completada ✅ - Listo para testing end-to-end
