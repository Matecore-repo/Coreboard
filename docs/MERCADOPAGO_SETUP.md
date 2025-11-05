# Configuración de Mercado Pago Checkout Pro y Checkout Público

Esta guía explica cómo configurar y usar la integración completa con Mercado Pago, incluyendo el sistema de checkout público para que los clientes puedan reservar turnos y pagar directamente desde un link.

## Requisitos Previos

1. Cuenta de Mercado Pago con acceso a la API
2. Aplicación creada en Mercado Pago (obtener `CLIENT_ID` y `CLIENT_SECRET`)
3. Proyecto Supabase configurado
4. Edge Functions desplegadas en Supabase
5. Base de datos con migraciones aplicadas

## Pasos de Configuración

### 1. Crear Aplicación en Mercado Pago

1. Ingresa a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Crea una nueva aplicación
3. Obtén tu `CLIENT_ID` y `CLIENT_SECRET`
4. Configura las URLs de callback:
   - **URL de éxito**: `https://tu-dominio.com/payment/success`
   - **URL de fallo**: `https://tu-dominio.com/payment/failure`
   - **URL de pendiente**: `https://tu-dominio.com/payment/pending`
   - **URL de webhook**: `https://tu-proyecto.supabase.co/functions/v1/mercadopago-webhook`

### 2. Configurar Secrets en Supabase

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Settings** > **Edge Functions** > **Secrets**
3. Agrega los siguientes secrets:

```
MP_CLIENT_ID=tu_client_id
MP_CLIENT_SECRET=tu_client_secret
MP_WEBHOOK_SECRET=tu_webhook_secret (opcional, para validar webhooks)
MP_TOKEN_KEY=tu_clave_de_cifrado (32 caracteres mínimo)
PUBLIC_EDGE_BASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

**Nota**: `MP_TOKEN_KEY` debe ser una clave segura de al menos 32 caracteres. Úsala para cifrar los tokens de acceso.

### 3. Aplicar Migraciones SQL

Ejecuta las siguientes migraciones en el orden indicado:

```bash
# 1. Crear tabla de credenciales
psql -f infra/db/migrations/add_mercadopago_credentials.sql

# 2. Crear tabla de pagos MP
psql -f infra/db/migrations/add_mp_payments.sql

# 3. Agregar campos MP a tabla payments
psql -f infra/db/migrations/add_mp_fields_to_payments.sql

# 4. Crear tabla opcional de outbox
psql -f infra/db/migrations/add_integration_outbox.sql

# 5. Aplicar RLS policies
psql -f infra/db/migrations/add_mp_credentials_rls.sql
psql -f infra/db/migrations/add_mp_payments_rls.sql

# 6. Crear función RPC para verificar conexión
psql -f infra/db/migrations/add_mp_check_connection_rpc.sql

# 7. Migración para payment links (checkout público)
psql -f infra/db/migrations/enhance_payment_links.sql
```

O ejecuta todas desde el SQL Editor de Supabase:

1. Ve a **SQL Editor** en Supabase Dashboard
2. Copia y pega el contenido de cada archivo de migración
3. Ejecuta cada migración en orden

### 4. Desplegar Edge Functions

1. Instala Supabase CLI si no lo tienes:

```bash
npm install -g supabase
```

2. Inicia sesión en Supabase:

```bash
supabase login
```

3. Enlaza tu proyecto:

```bash
supabase link --project-ref tu-project-ref
```

4. Despliega todas las Edge Functions necesarias:

```bash
# Funciones de autenticación y tokens
supabase functions deploy auth-mp-connect
supabase functions deploy auth-mp-callback
supabase functions deploy mp-token-refresh
supabase functions deploy mp-disconnect

# Funciones de pagos
supabase functions deploy mp-create-preference
supabase functions deploy mercadopago-webhook

# Funciones de payment links (checkout público)
supabase functions deploy create-payment-link
supabase functions deploy get-payment-link-config

# Funciones públicas del checkout
supabase functions deploy public-get-salon-services
supabase functions deploy public-get-salon-stylists
supabase functions deploy public-get-availability
supabase functions deploy public-create-appointment
```

### 5. Configurar Variables de Entorno del Frontend

Agrega las siguientes variables a tu archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://tu-proyecto.supabase.co/functions/v1
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

### 6. Configurar Webhook en Mercado Pago

1. En el dashboard de Mercado Pago, ve a **Webhooks**
2. Agrega la URL: `https://tu-proyecto.supabase.co/functions/v1/mercadopago-webhook`
3. Selecciona los eventos a escuchar:
   - `payment`
   - `merchant_order`
4. Guarda la configuración

## Uso del Sistema

### Parte 1: Conectar Mercado Pago (Owner/Admin)

**Paso inicial obligatorio**: Antes de usar cualquier funcionalidad de pago, debes conectar tu cuenta de Mercado Pago.

1. Ingresa al CRM como Owner o Admin
2. Ve a **Configuración** > **Mercado Pago**
3. Haz clic en **Conectar Mercado Pago**
4. Serás redirigido a Mercado Pago para autorizar la aplicación
5. Una vez autorizado, serás redirigido de vuelta al CRM
6. Verás el estado "Conectado" con tu Collector ID

**Importante**: Sin esta conexión, no podrás generar links de pago ni usar el checkout público.

### Parte 2: Generar Links de Pago para Checkout Público

El checkout público permite que los clientes reserven turnos y paguen directamente desde un link compartido, sin necesidad de crear el turno manualmente en el CRM.

#### Cómo generar un link de pago:

1. **Desde el CRM**:
   - Usa el botón **"Generar link de pago"** (puede estar en el menú de acciones rápidas o en la vista de turnos)
   - Se abre el modal `PaymentLinkModal`
   - Selecciona:
     - **Salón**: El salón donde se realizará el servicio
     - **Título**: Título del link (ej: "Reserva tu turno - Salón Centro")
     - **Descripción**: Descripción opcional
   - Haz clic en **Generar link**
   - Se genera un link único con formato: `https://tu-dominio.com/book/[token]`
   - Copia el link y compártelo con tus clientes

2. **Características del link**:
   - El link es único y seguro (usando hash SHA-256)
   - Expira automáticamente después de 30 días (configurable)
   - Puede desactivarse manualmente si es necesario
   - Solo funciona para el salón seleccionado

#### Flujo del cliente con el link:

1. **Cliente recibe el link**: `https://tu-dominio.com/book/[token]`

2. **Página de checkout público**: El cliente ingresa y ve:
   - Título y descripción del link
   - Stepper con 5 pasos:
     - **Paso 1**: Selección de servicio (muestra servicios disponibles del salón)
     - **Paso 2**: Selección de estilista (opcional, puede elegir "Cualquiera")
     - **Paso 3**: Selección de fecha y hora (calendario + slots disponibles)
     - **Paso 4**: Datos personales (nombre requerido, teléfono y email opcionales)
     - **Paso 5**: Resumen y confirmación

3. **Confirmación y pago**:
   - El cliente revisa el resumen
   - Hace clic en "Confirmar y proceder al pago"
   - Se crea el turno con estado `pending` en la base de datos
   - El cliente es redirigido automáticamente a Mercado Pago

4. **Pago en Mercado Pago**:
   - El cliente completa el pago en Mercado Pago
   - Puede usar cualquier método de pago disponible

5. **Resultado**:
   - **Pago aprobado**: Cliente va a `/payment/success` → Turno se actualiza a `confirmed`
   - **Pago rechazado**: Cliente va a `/payment/failure` → Turno queda en `pending`
   - **Pago pendiente**: Cliente va a `/payment/pending` → Turno queda en `pending` hasta confirmación

6. **Webhook automático**:
   - Mercado Pago envía un webhook a `mercadopago-webhook`
   - El webhook actualiza el estado del turno según el estado del pago
   - Si el pago es aprobado, el turno cambia a `confirmed`

### Parte 3: Generar Links de Pago para Turnos Existentes (Alternativa)

Si ya tienes un turno creado en el CRM y solo quieres generar un link de pago:

1. Selecciona el turno en el CRM
2. Usa la opción "Generar link de pago" (si está disponible)
3. El sistema crea una preferencia de pago en Mercado Pago
4. Obtienes un link directo al checkout de Mercado Pago
5. El cliente paga y el webhook actualiza el estado del turno

## Servicios y Edge Functions Requeridos

Para que el sistema funcione correctamente, necesitas las siguientes Edge Functions desplegadas:

### Funciones de Autenticación y Tokens
- ✅ `auth-mp-connect` - Inicia el flujo OAuth con Mercado Pago
- ✅ `auth-mp-callback` - Maneja el callback de OAuth y guarda tokens
- ✅ `mp-token-refresh` - Refresca tokens automáticamente
- ✅ `mp-disconnect` - Desconecta la cuenta de Mercado Pago

### Funciones de Pagos
- ✅ `mp-create-preference` - Crea preferencias de pago en MP (para turnos existentes)
- ✅ `mercadopago-webhook` - Procesa webhooks de MP y actualiza estados

### Funciones de Payment Links (Checkout Público)
- ✅ `create-payment-link` - Genera un nuevo payment link con token único
- ✅ `get-payment-link-config` - Obtiene la configuración de un payment link por token

### Funciones Públicas del Checkout
- ✅ `public-get-salon-services` - Obtiene servicios disponibles del salón (público)
- ✅ `public-get-salon-stylists` - Obtiene estilistas disponibles del salón (público)
- ✅ `public-get-availability` - Calcula horarios disponibles para una fecha (público)
- ✅ `public-create-appointment` - Crea turno y preferencia de pago en MP (público)

## Flujos de Pago

### Flujo 1: Checkout Público (Nuevo turno desde link)

```
1. Owner genera link → https://tu-dominio.com/book/[token]
2. Cliente abre link → Página de checkout público
3. Cliente completa stepper (servicio, estilista, fecha, datos)
4. Cliente confirma → Se crea turno (status: 'pending')
5. Cliente es redirigido → Mercado Pago checkout
6. Cliente paga → Mercado Pago procesa
7. Webhook recibe notificación → Actualiza turno (status: 'confirmed')
8. Cliente es redirigido → /payment/success|failure|pending
```

### Flujo 2: Pago de Turno Existente

```
1. Owner crea turno en CRM → Turno con status: 'pending'
2. Owner genera link de pago → Preferencia de MP creada
3. Cliente recibe link → Mercado Pago checkout
4. Cliente paga → Mercado Pago procesa
5. Webhook recibe notificación → Actualiza turno (status: 'confirmed')
6. Cliente es redirigido → /payment/success|failure|pending
```

## Estructura de Datos

### Payment Links

Los payment links se guardan en la tabla `payment_links`:

- `id` - ID único del link
- `org_id` - ID de la organización
- `salon_id` - ID del salón
- `token_hash` - Hash SHA-256 del token (no se guarda el token plano)
- `title` - Título del link
- `description` - Descripción opcional
- `metadata` - Metadatos adicionales (JSON)
- `expires_at` - Fecha de expiración
- `active` - Si está activo o no
- `created_at` - Fecha de creación

### Turnos Públicos

Los turnos creados desde el checkout público tienen:
- `created_by: null` - Indica que es un turno público
- `status: 'pending'` - Estado inicial
- Se actualiza a `confirmed` cuando el pago es aprobado

## URLs y Rutas

### URLs Públicas (No requieren autenticación)

- `/book/[token]` - Checkout público del cliente
- `/payment/success` - Página de éxito después del pago
- `/payment/failure` - Página de error después del pago
- `/payment/pending` - Página de pago pendiente

### Edge Functions Públicas

Todas las funciones que empiezan con `public-` son accesibles sin autenticación, pero validan el token del payment link:

- `public-get-salon-services?salon_id=X&token=Y`
- `public-get-salon-stylists?salon_id=X&token=Y`
- `public-get-availability?salon_id=X&service_id=Y&stylist_id=Z&date=YYYY-MM-DD&token=Y`
- `public-create-appointment` (POST con token en el body)

## Testing

### Usar Cuenta de Prueba

1. Crea una cuenta de prueba en Mercado Pago
2. Usa las tarjetas de prueba proporcionadas por MP
3. Verifica que los webhooks lleguen correctamente

### Tarjetas de Prueba

- **Aprobada**: `5031 7557 3453 0604` (CVV: 123)
- **Rechazada**: `5031 4332 1540 6351` (CVV: 123)
- **Pendiente**: `5031 7557 3453 0604` (CVV: 123, usar método "Pendiente")

### Probar Checkout Público

1. Genera un payment link desde el CRM
2. Abre el link en modo incógnito (para simular cliente)
3. Completa todo el flujo del checkout
4. Usa una tarjeta de prueba para el pago
5. Verifica que el turno se cree correctamente
6. Verifica que el webhook actualice el estado

## Troubleshooting

### Error: "No hay cuenta de Mercado Pago conectada"

- Verifica que hayas completado el flujo OAuth en Configuración > Mercado Pago
- Revisa los logs de la Edge Function `auth-mp-callback`
- Verifica que las credenciales se hayan guardado en la tabla `mp_credentials`

### Error: "Link de pago inválido o expirado"

- El token del payment link no es válido
- El link ha expirado (verifica `expires_at` en `payment_links`)
- El link está desactivado (`active: false`)
- Verifica que el token no haya sido modificado

### Error: "Error creando preferencia de pago"

- Verifica que `MP_CLIENT_ID` y `MP_CLIENT_SECRET` estén correctos
- Revisa que el access_token no haya expirado (se refresca automáticamente)
- Verifica los logs de la Edge Function `mp-create-preference` o `public-create-appointment`
- Asegúrate de que Mercado Pago esté conectado en la organización

### Webhooks no llegan

- Verifica que la URL del webhook esté correctamente configurada en MP
- Revisa los logs de la Edge Function `mercadopago-webhook`
- Verifica que el webhook no esté bloqueado por firewall
- Asegúrate de que `PUBLIC_EDGE_BASE_URL` esté correctamente configurado

### Error: "Token inválido" en funciones públicas

- El token del payment link no coincide con el `token_hash` en la BD
- Verifica que el token no haya sido modificado en la URL
- Asegúrate de que el `salon_id` en la request coincida con el del payment link

### No aparecen servicios/estilistas en el checkout

- Verifica que el salón tenga servicios activos en `salon_services`
- Verifica que los servicios estén activos (`active: true`)
- Verifica que los estilistas estén asignados al salón en `salon_employees`
- Revisa los logs de `public-get-salon-services` y `public-get-salon-stylists`

### No hay horarios disponibles

- Verifica que el salón tenga horarios configurados
- Revisa que no haya conflictos con turnos existentes
- Verifica la duración del servicio (puede que no quepan en el horario)
- Revisa los logs de `public-get-availability`

## Seguridad

- **Nunca** expongas `MP_CLIENT_SECRET` ni `MP_TOKEN_KEY` en el frontend
- **Siempre** usa Edge Functions para operaciones sensibles
- **Verifica** la firma de los webhooks (configura `MP_WEBHOOK_SECRET`)
- **Mantén** los secrets actualizados y rotados periódicamente
- Los tokens de payment links se guardan como hash SHA-256, nunca en texto plano
- Las Edge Functions públicas validan el token en cada request
- Los payment links expiran automáticamente (30 días por defecto)

## Checklist de Configuración

Antes de usar el sistema, verifica:

- [ ] Cuenta de Mercado Pago creada y aplicación configurada
- [ ] Secrets configurados en Supabase (MP_CLIENT_ID, MP_CLIENT_SECRET, etc.)
- [ ] Todas las migraciones SQL aplicadas
- [ ] Todas las Edge Functions desplegadas
- [ ] Variables de entorno del frontend configuradas
- [ ] Webhook configurado en Mercado Pago
- [ ] Mercado Pago conectado desde el CRM (Configuración > Mercado Pago)
- [ ] Salones creados en el CRM
- [ ] Servicios creados y asignados a salones
- [ ] Estilistas asignados a salones
- [ ] Probar generación de payment link
- [ ] Probar checkout público completo
- [ ] Probar webhook de Mercado Pago

## Soporte

Para más información, consulta:
- [Documentación de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs)
- [Documentación de Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentación de react-day-picker](https://react-day-picker.js.org/) (usado en el calendario)
