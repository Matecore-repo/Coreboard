# Integración de Payment Links - Proceso Completo

## Resumen Ejecutivo

Este documento detalla el proceso completo de implementación y corrección de la funcionalidad de Payment Links (links de pago públicos) en Coreboard, incluyendo los problemas encontrados, las soluciones aplicadas y el estado final del sistema.

## Herramientas Utilizadas

### 1. Supabase MCP (Model Context Protocol)
- **Conexión**: Mediante el MCP de Supabase integrado en Cursor
- **Proyecto ID**: `hawpywnmkatwlcbtffrg`
- **Funciones principales utilizadas**:
  - `mcp_supabase_apply_migration`: Para aplicar migraciones SQL
  - `mcp_supabase_execute_sql`: Para ejecutar queries SQL directos
  - `mcp_supabase_get_logs`: Para revisar logs de Edge Functions
  - `mcp_supabase_list_tables`: Para verificar estructura de la base de datos
  - `mcp_supabase_list_extensions`: Para verificar extensiones instaladas

### 2. Supabase CLI
- **Comando principal**: `npx --yes supabase functions deploy`
- **Uso**: Despliegue de Edge Functions sin necesidad de tener Supabase CLI instalado localmente
- **Flags importantes**:
  - `--project-ref`: ID del proyecto Supabase
  - `--workdir`: Directorio de trabajo
  - `--no-verify-jwt`: Para funciones públicas que no requieren autenticación

### 3. Browser Extension MCP
- **Uso**: Para probar el flujo completo en el navegador
- **URL de prueba**: `http://192.168.100.50:3000` (servidor local)
- **URL de producción**: `https://coreboard.vercel.app`

## Problemas Encontrados y Soluciones

### Problema 1: Formato bytea para token_hash

**Problema**: 
- La columna `token_hash` en `app.payment_links` es de tipo `bytea`
- PostgREST/Supabase no puede manejar directamente `Uint8Array` desde JavaScript
- Intentos de convertir a hexadecimal fallaban al insertar o buscar

**Solución Aplicada**:
1. Creación de función RPC `create_payment_link` en PostgreSQL que maneja el bytea directamente
2. Uso de `extensions.digest()` para calcular SHA-256 hash del token
3. La función RPC genera el token, calcula el hash y lo inserta en la base de datos

**Código de la función RPC**:
```sql
CREATE OR REPLACE FUNCTION public.create_payment_link(
  p_org_id uuid,
  p_salon_id uuid,
  p_title text DEFAULT 'Reserva tu turno',
  p_description text DEFAULT NULL,
  p_token text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, extensions, pg_catalog
AS $$
DECLARE
  v_token text;
  v_token_hash bytea;
  v_expires_at timestamptz;
  v_payment_link_id uuid;
BEGIN
  -- Generar token si no se proporciona
  IF p_token IS NULL THEN
    v_token := encode(extensions.gen_random_bytes(32), 'hex');
  ELSE
    v_token := p_token;
  END IF;

  -- Calcular hash SHA-256 del token
  v_token_hash := extensions.digest(v_token, 'sha256');

  -- ... resto de la función
END;
$$;
```

**Migración aplicada**: `create_payment_link_rpc` (vía MCP)

---

### Problema 2: Extensión pgcrypto no disponible

**Problema**:
- La función `gen_random_bytes()` no estaba disponible
- Error: `function gen_random_bytes(integer) does not exist`

**Solución Aplicada**:
1. Verificación de extensiones instaladas con `mcp_supabase_list_extensions`
2. Habilitación de `pgcrypto` con `CREATE EXTENSION IF NOT EXISTS pgcrypto`
3. Uso de `extensions.gen_random_bytes()` en lugar de `gen_random_bytes()` directamente

**Migración aplicada**: `enable_pgcrypto_and_fix_create_payment_link` (vía MCP)

---

### Problema 3: Nombre incorrecto de tabla organizations

**Problema**:
- La función RPC `get_payment_link_by_token` buscaba `app.organizations`
- La tabla real se llama `app.orgs`
- Error: `relation "app.organizations" does not exist`

**Solución Aplicada**:
1. Verificación de estructura con `mcp_supabase_list_tables`
2. Corrección de la función RPC para usar `app.orgs` en lugar de `app.organizations`

**Migración aplicada**: `fix_get_payment_link_by_token_table_name` (vía MCP)

---

### Problema 4: Autenticación requerida en get-payment-link-config

**Problema**:
- La Edge Function `get-payment-link-config` requería autenticación
- Error 401: "Missing authorization header"
- Los clientes no pueden validar el token sin autenticarse primero (círculo vicioso)

**Solución Aplicada**:
1. Eliminación de la validación de autenticación en el código de la función
2. Despliegue con flag `--no-verify-jwt` para permitir acceso público
3. La validación del token es suficiente para verificar el link

**Cambios en el código**:
```typescript
// ANTES (requería autenticación):
const authHeader = req.headers.get('Authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return new Response(
    JSON.stringify({ error: 'Autenticación requerida...' }),
    { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
}

// DESPUÉS (no requiere autenticación):
// No requerir autenticación de usuario para validación inicial del token
// Pero Supabase requiere un header de autorización (anon key es suficiente)
// La validación del token es suficiente para verificar el link
```

**Comando de despliegue**:
```bash
npx --yes supabase functions deploy get-payment-link-config \
  --project-ref hawpywnmkatwlcbtffrg \
  --workdir "C:\Users\Matecore\Downloads\Coreboard" \
  --no-verify-jwt
```

---

### Problema 5: Headers CORS

**Problema**:
- Las Edge Functions no tenían headers CORS configurados
- Los requests desde el frontend fallaban por CORS

**Solución Aplicada**:
- Agregado de headers CORS en ambas funciones:
  - `create-payment-link`
  - `get-payment-link-config`

**Código**:
```typescript
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## Funciones RPC Creadas

### 1. `public.create_payment_link`
- **Propósito**: Crear un payment link con manejo correcto de bytea
- **Parámetros**:
  - `p_org_id`: UUID de la organización
  - `p_salon_id`: UUID del salón
  - `p_title`: Título del link (default: 'Reserva tu turno')
  - `p_description`: Descripción (opcional)
  - `p_token`: Token personalizado (opcional, se genera si no se proporciona)
  - `p_expires_at`: Fecha de expiración (opcional, default: 30 días)
  - `p_metadata`: Metadata JSON (opcional)
- **Retorna**: JSON con `id`, `token`, `expires_at`
- **Schema**: `public` (accesible desde PostgREST)

### 2. `public.get_payment_link_by_token`
- **Propósito**: Obtener información de un payment link por su token
- **Parámetros**:
  - `p_token`: Token del payment link (texto plano)
- **Retorna**: JSON con toda la información del link, incluyendo `salon` y `org`
- **Validaciones**:
  - Calcula hash SHA-256 del token
  - Busca por `token_hash` (bytea)
  - Verifica que esté activo (`active = true`)
  - Verifica que no haya expirado (`expires_at > now()`)

---

## Edge Functions Modificadas

### 1. `create-payment-link`
- **Estado**: ✅ Funcionando
- **Cambios principales**:
  - Uso de función RPC en lugar de insertar directamente
  - Headers CORS agregados
  - Manejo de errores mejorado

### 2. `get-payment-link-config`
- **Estado**: ✅ Funcionando
- **Cambios principales**:
  - Eliminación de requerimiento de autenticación
  - Uso de función RPC para buscar por token
  - Despliegue con `--no-verify-jwt`
  - Headers CORS agregados

---

## Flujo Completo Implementado

### 1. Generación de Payment Link
1. Usuario hace clic en "Generar link de pago" en el dashboard
2. Frontend llama a `/functions/v1/create-payment-link` con:
   - `org_id`
   - `salon_id`
   - `title` (opcional)
   - `description` (opcional)
3. Edge Function llama a `public.create_payment_link()` RPC
4. RPC genera token aleatorio (32 bytes)
5. RPC calcula hash SHA-256 del token
6. RPC inserta en `app.payment_links` con `token_hash` (bytea)
7. RPC retorna `id`, `token`, `expires_at`
8. Edge Function retorna URL completa: `https://coreboard.vercel.app/book/{token}`
9. Frontend muestra el link en un modal

### 2. Validación de Payment Link
1. Cliente accede a `https://coreboard.vercel.app/book/{token}`
2. Frontend llama a `/functions/v1/get-payment-link-config?token={token}`
3. Edge Function llama a `public.get_payment_link_by_token({p_token: token})`
4. RPC calcula hash SHA-256 del token recibido
5. RPC busca en `app.payment_links` por `token_hash`
6. RPC verifica que esté activo y no haya expirado
7. RPC retorna información completa (salon, org, etc.)
8. Edge Function retorna configuración al frontend
9. Frontend muestra el formulario de checkout público

---

## Estado Actual del Sistema

### ✅ Funcionando Correctamente

1. **Generación de Payment Links**
   - La función `create-payment-link` genera links correctamente
   - Los tokens se generan de forma segura (32 bytes aleatorios)
   - Los hashes se calculan correctamente (SHA-256)
   - Los links se guardan en la base de datos con formato bytea

2. **Validación de Payment Links**
   - La función `get-payment-link-config` valida tokens correctamente
   - No requiere autenticación para validación inicial
   - Retorna información completa del link, salon y organización

3. **Funciones RPC**
   - `create_payment_link`: Funciona correctamente
   - `get_payment_link_by_token`: Funciona correctamente
   - Ambas manejan bytea correctamente

4. **Integración Frontend-Backend**
   - El modal de generación de links funciona
   - Los links generados se muestran correctamente
   - La página `/book/[token]` carga correctamente

### ⚠️ Pendiente / Notas

1. **Servicios No Configurados**
   - El checkout público muestra "No hay servicios disponibles"
   - Esto es esperado si no hay servicios configurados para el salón
   - **Siguiente paso**: Verificar que hay servicios y precios configurados

2. **Autenticación en Checkout Público**
   - Actualmente el checkout público requiere autenticación con Google
   - Esto puede ser un problema para algunos usuarios
   - **Consideración**: Evaluar si se debe requerir autenticación o permitir checkout anónimo

3. **Configuración de JWT en Edge Functions**
   - La función `get-payment-link-config` está desplegada con `--no-verify-jwt`
   - Esto es necesario para acceso público, pero debe revisarse la seguridad
   - **Consideración**: Implementar validación adicional del token en la función

---

## Próximos Pasos Recomendados

### 1. Configurar Servicios y Precios
- Verificar que hay servicios creados en la organización
- Verificar que hay precios configurados para los servicios en el salón
- Probar el flujo completo de reserva con servicios reales

### 2. Probar Flujo Completo de Reserva
- Generar un payment link
- Acceder al link como cliente
- Seleccionar servicio
- Seleccionar profesional
- Seleccionar fecha y hora
- Completar datos personales
- Confirmar reserva
- Verificar que el turno se crea en el sistema

### 3. Integración con Mercado Pago (si aplica)
- Verificar que la integración con Mercado Pago está configurada
- Probar el flujo de pago con Mercado Pago
- Verificar que los pagos se procesan correctamente
- Verificar que los webhooks funcionan

### 4. Mejoras de Seguridad
- Implementar rate limiting en las Edge Functions públicas
- Agregar validación adicional del token (además del hash)
- Considerar agregar un nonce o timestamp al token
- Implementar logging de accesos a payment links

### 5. Mejoras de UX
- Agregar mensaje cuando no hay servicios disponibles
- Mejorar la UI del checkout público
- Agregar validaciones en el frontend
- Agregar feedback visual durante el proceso

---

## Comandos Útiles

### Ver logs de Edge Functions
```sql
-- Usar MCP:
mcp_supabase_get_logs(project_id: "hawpywnmkatwlcbtffrg", service: "edge-function")
```

### Probar función RPC directamente
```sql
SELECT public.create_payment_link(
  'a63f505d-9410-420d-bb60-880cb318e191'::uuid,
  (SELECT id FROM app.salons WHERE name = 'Demo Salon QA' LIMIT 1)::uuid,
  'Test desde SQL',
  NULL,
  NULL,
  NULL,
  '{}'::jsonb
);

SELECT public.get_payment_link_by_token('6cc67b07395056cac923495bc92c5e8f42a049b9faaaabed4682d70ff60c9487');
```

### Desplegar Edge Functions
```bash
# Desplegar create-payment-link
npx --yes supabase functions deploy create-payment-link \
  --project-ref hawpywnmkatwlcbtffrg \
  --workdir "C:\Users\Matecore\Downloads\Coreboard"

# Desplegar get-payment-link-config (sin JWT)
npx --yes supabase functions deploy get-payment-link-config \
  --project-ref hawpywnmkatwlcbtffrg \
  --workdir "C:\Users\Matecore\Downloads\Coreboard" \
  --no-verify-jwt
```

### Verificar estructura de tablas
```sql
-- Usar MCP:
mcp_supabase_list_tables(project_id: "hawpywnmkatwlcbtffrg", schemas: ["public", "app"])
```

---

## Lecciones Aprendidas

1. **PostgREST y bytea**: PostgREST no puede manejar bytea directamente desde JavaScript. Es necesario usar funciones RPC en PostgreSQL para manejar bytea correctamente.

2. **Extensiones de PostgreSQL**: Al usar funciones como `gen_random_bytes()` o `digest()`, es necesario verificar que la extensión `pgcrypto` esté habilitada y usar el schema correcto (`extensions.`).

3. **JWT en Edge Functions**: Por defecto, Supabase Edge Functions requieren JWT. Para funciones públicas, es necesario desplegar con `--no-verify-jwt` o configurar la función como pública en el dashboard.

4. **Nombres de tablas**: Es importante verificar los nombres reales de las tablas en la base de datos antes de crear funciones RPC que las referencien.

5. **MCP de Supabase**: El MCP de Supabase es muy útil para aplicar migraciones y ejecutar queries sin necesidad de tener acceso directo a la base de datos.

---

## Referencias

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [PostgreSQL pgcrypto Extension](https://www.postgresql.org/docs/current/pgcrypto.html)
- [PostgREST Documentation](https://postgrest.org/)
- [Supabase MCP Documentation](https://supabase.com/docs/guides/cli)

---

**Última actualización**: 2025-11-05
**Estado**: ✅ Payment Links funcionando correctamente
**Próximo paso**: Configurar servicios y probar flujo completo de reserva

Próximos pasos:
Configurar servicios y precios
Probar flujo completo de reserva
Integración con Mercado Pago
Mejoras de seguridad
Mejoras de UX