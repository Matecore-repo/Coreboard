# Configuración de Mercado Pago Checkout Pro

Esta guía explica cómo configurar y desplegar la integración con Mercado Pago Checkout Pro en el CRM.

## Requisitos Previos

1. Cuenta de Mercado Pago con acceso a la API
2. Aplicación creada en Mercado Pago (obtener `CLIENT_ID` y `CLIENT_SECRET`)
3. Proyecto Supabase configurado
4. Edge Functions desplegadas en Supabase

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

4. Despliega las Edge Functions:

```bash
# Desplegar todas las funciones
supabase functions deploy auth-mp-connect
supabase functions deploy auth-mp-callback
supabase functions deploy mp-create-preference
supabase functions deploy mercadopago-webhook
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

## Uso

### Para el Dueño (Owner)

1. Ingresa a **Configuración** > **Mercado Pago**
2. Haz clic en **Conectar Mercado Pago**
3. Serás redirigido a Mercado Pago para autorizar la aplicación
4. Una vez autorizado, serás redirigido de vuelta al CRM
5. Verás el estado "Conectado" con tu Collector ID

### Para Generar Links de Pago

1. Desde cualquier vista, usa el botón **"Generar link de pago"**
2. Selecciona el turno y el monto
3. El sistema creará una preferencia de pago en Mercado Pago
4. Copia el link y compártelo con el cliente
5. El cliente será redirigido al checkout de Mercado Pago
6. Una vez pagado, el webhook actualizará el estado del turno

## Flujo de Pago

1. **Cliente recibe link de pago** → Abre el link
2. **Checkout de Mercado Pago** → Selecciona método de pago y completa
3. **Webhook procesa el pago** → Edge Function actualiza estado
4. **Cliente es redirigido** → Página de éxito/fallo/pendiente
5. **Turno se actualiza** → Estado cambia a "confirmed" si el pago fue aprobado

## Testing

### Usar Cuenta de Prueba

1. Crea una cuenta de prueba en Mercado Pago
2. Usa las tarjetas de prueba proporcionadas por MP
3. Verifica que los webhooks lleguen correctamente

### Tarjetas de Prueba

- **Aprobada**: `5031 7557 3453 0604` (CVV: 123)
- **Rechazada**: `5031 4332 1540 6351` (CVV: 123)
- **Pendiente**: `5031 7557 3453 0604` (CVV: 123, usar método "Pendiente")

## Troubleshooting

### Error: "No hay cuenta de Mercado Pago conectada"

- Verifica que hayas completado el flujo OAuth
- Revisa los logs de la Edge Function `auth-mp-callback`
- Verifica que las credenciales se hayan guardado en la BD

### Error: "Error creando preferencia de pago"

- Verifica que `MP_CLIENT_ID` y `MP_CLIENT_SECRET` estén correctos
- Revisa que el access_token no haya expirado
- Verifica los logs de la Edge Function `mp-create-preference`

### Webhooks no llegan

- Verifica que la URL del webhook esté correctamente configurada en MP
- Revisa los logs de la Edge Function `mercadopago-webhook`
- Verifica que el webhook no esté bloqueado por firewall

### Tokens cifrados no se pueden leer

- Verifica que `MP_TOKEN_KEY` sea la misma en todas las Edge Functions
- Asegúrate de que la clave tenga al menos 32 caracteres
- Revisa que los tokens no hayan sido corrompidos en la BD

## Seguridad

- **Nunca** expongas `MP_CLIENT_SECRET` ni `MP_TOKEN_KEY` en el frontend
- **Siempre** usa Edge Functions para operaciones sensibles
- **Verifica** la firma de los webhooks (configura `MP_WEBHOOK_SECRET`)
- **Mantén** los secrets actualizados y rotados periódicamente

## Soporte

Para más información, consulta:
- [Documentación de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs)
- [Documentación de Supabase Edge Functions](https://supabase.com/docs/guides/functions)

