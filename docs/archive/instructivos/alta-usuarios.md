# 👥 Alta de Usuarios - Sistema de Invitaciones

COREBOARD utiliza un sistema seguro de invitaciones con tokens de un solo uso para controlar el acceso a organizaciones.

## 🔐 Arquitectura de Seguridad

### Tokens Hashed (SHA-256)
- Los tokens **NO se guardan en texto plano** en la base de datos
- Se almacenan como hash SHA-256 para prevenir filtraciones
- El token real se muestra solo al administrador que lo genera

### Un Solo Uso
- Cada token puede ser usado exactamente **una vez**
- Se marca como `used_at` al ser reclamado
- Validación atómica con `FOR UPDATE` (previene race conditions)

### Expiración Automática
- Tokens expiran automáticamente (default: 7 días)
- Configurable por invitación
- Validación en tiempo real

## 🎯 Roles del Sistema

| Rol | Descripción | Permisos UI | Permisos BD |
|-----|-------------|-------------|-------------|
| `admin` | Administrador de plataforma | ✅ **Todo el sistema** | ✅ **Super admin** |
| `owner` | Propietario de salón | ✅ Todo su salón | ✅ Full access a su org |
| `employee` | Empleado de salón | ❌ Solo: Inicio, Turnos, Clientes | ✅ Lectura + turnos |

## 🚀 Flujo de Invitación

### 1. Generación de Token (Admin)

```bash
# Sintaxis del comando
node scripts/create_invitation.js <rol> <org_id> [email] [dias=7]

# Ejemplos
node scripts/create_invitation.js owner abc123 owner@empresa.com
node scripts/create_invitation.js employee abc123 empleado@empresa.com
node scripts/create_invitation.js admin abc123 30  # 30 días válido
```

**Output del comando:**
```
✅ Invitación creada
ID: 123e4567-e89b-12d3-a456-426614174000
Org: abc123-def456-ghi789
Email: owner@empresa.com
Role: owner
Expira: 2025-11-03T18:52:30.000Z
---
🔑 TOKEN (compartilo con la persona invitada):
aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE
---
⚠️ Guardá este token. No se puede recuperar desde la base.
```

### 2. Compartir Token
- El admin comparte el **token plano** con el invitado
- El invitado lo usa durante el registro
- El token se invalida automáticamente después del uso

### 3. Registro del Invitado

```typescript
// En AuthContext.tsx - signUp con token
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { invite_token: token } // Token incluido en metadata
  }
});
```

### 4. Reclamo Automático (RPC)

Al completar el registro, se ejecuta automáticamente:

```sql
-- Función claim_invitation (RPC)
SELECT claim_invitation('aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE')
-- Retorna: { organization_id, role }
```

**Validaciones del RPC:**
- ✅ Token existe y no está usado
- ✅ Token no ha expirado
- ✅ Email coincide (si está restringido)
- ✅ Usuario autenticado

## 🗄️ Estructura de Base de Datos

### Tabla `invitations`

```sql
CREATE TABLE public.invitations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid REFERENCES app.orgs(id), -- NULL para admin (no pertenece a org específica),
  email            text, -- Opcional: restringe a email específico
  role             text NOT NULL CHECK (role IN ('admin','owner','employee')),
  token_hash       bytea NOT NULL, -- SHA-256 del token
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at          timestamptz, -- NULL = disponible, NOT NULL = usado
  used_by          uuid REFERENCES auth.users(id),
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Índices críticos
CREATE UNIQUE INDEX invitations_token_unique_open
  ON public.invitations(token_hash) WHERE used_at IS NULL;
```

### Tabla `memberships`

```sql
CREATE TABLE public.memberships (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('admin','owner','employee')),
  is_primary      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id) -- Un usuario por org
);
```

## 🔒 Políticas RLS

### Invitaciones (Restringidas)
```sql
-- Nadie puede leer tokens (previene filtraciones)
CREATE POLICY "inv_no_select" ON public.invitations FOR SELECT USING (false);

-- Solo owners/admins pueden gestionar invitaciones de su org
CREATE POLICY "inv_admin_manage" ON public.invitations
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = invitations.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );
```

### Membresías (Por Usuario)
```sql
-- Cada usuario ve solo sus propias membresías
CREATE POLICY "memberships_read_own" ON public.memberships
  FOR SELECT USING (user_id = auth.uid());
```

## 🛠️ Scripts de Administración

### Generar Invitación
```javascript
// scripts/create_invitation.js
// Requiere: SUPABASE_URL, SUPABASE_SERVICE_KEY

const token = crypto.randomBytes(32).toString('base64url');
const token_hash = crypto.createHash('sha256').update(token).digest();

await supabase.from('invitations').insert({
  organization_id,
  role,
  token_hash,
  email: emailArg || null,
  expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
});
```

### Verificar Estado
```sql
-- Invitaciones activas
SELECT id, email, role, expires_at, used_at
FROM public.invitations
WHERE used_at IS NULL
  AND now() < expires_at;

-- Membresías por organización
SELECT u.email, m.role, m.is_primary
FROM public.memberships m
JOIN auth.users u ON m.user_id = u.id
WHERE m.org_id = 'your-org-id';
```

## ⚠️ Consideraciones de Seguridad

### Ataques Mitigados
- **Token Leakage**: Hashing previene exposición en dumps de BD
- **Replay Attacks**: Un solo uso + expiración automática
- **Race Conditions**: `FOR UPDATE` en validación atómica
- **Email Spoofing**: Validación de email si está restringido

### Mejores Prácticas
- ✅ Usar HTTPS siempre
- ✅ Service key solo en servidor (nunca en cliente)
- ✅ Tokens con entropía alta (32 bytes)
- ✅ Expiración corta (7 días max)
- ✅ Logs de auditoría en producción

## 🧪 Testing

### Flujo Completo de Testing

1. **Crear organización**
```sql
INSERT INTO app.orgs (name) VALUES ('Test Corp') RETURNING id;
-- Result: abc123-def456-ghi789
```

2. **Generar invitación**
```bash
node scripts/create_invitation.js owner abc123-def456-ghi789 test@example.com
# Output: 🔑 TOKEN: aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE
```

3. **Registrar usuario con token**
```typescript
await signUp('test@example.com', 'password123', 'aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE');
```

4. **Verificar membresía creada**
```sql
SELECT * FROM public.memberships WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'test@example.com'
);
-- Debe retornar: role='owner', org_id='abc123...'
```

### Casos de Error
- ❌ **Token expirado**: `claim_invitation` retorna error
- ❌ **Token usado**: `claim_invitation` retorna error
- ❌ **Email mismatch**: `claim_invitation` retorna error
- ❌ **Usuario no autenticado**: `claim_invitation` retorna error

## 📈 Monitoreo y Auditoría

### Métricas a Monitorear
- Invitaciones creadas vs usadas
- Tasa de expiración de tokens
- Errores en claim_invitation
- Usuarios por organización

### Logs de Auditoría
```sql
-- Invitaciones reclamadas recientemente
SELECT i.email, i.role, i.used_at, u.email as claimed_by
FROM public.invitations i
JOIN auth.users u ON i.used_by = u.id
WHERE i.used_at > now() - interval '24 hours'
ORDER BY i.used_at DESC;
```</contents>
</xai:function_call">**Output del comando:**
```
✅ Invitación creada
ID: 123e4567-e89b-12d3-a456-426614174000
Org: abc123-def456-ghi789
Email: owner@empresa.com
Role: owner
Expira: 2025-11-03T18:52:30.000Z
---
🔑 TOKEN (compartilo con la persona invitada):
aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE
---
⚠️ Guardá este token. No se puede recuperar desde la base.
```

### 2. Compartir Token
- El admin comparte el **token plano** con el invitado
- El invitado lo usa durante el registro
- El token se invalida automáticamente después del uso

### 3. Registro del Invitado

```typescript
// En AuthContext.tsx - signUp con token
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { invite_token: token } // Token incluido en metadata
  }
});
```

### 4. Reclamo Automático (RPC)

Al completar el registro, se ejecuta automáticamente:

```sql
-- Función claim_invitation (RPC)
SELECT claim_invitation('aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE')
-- Retorna: { organization_id, role }
```

**Validaciones del RPC:**
- ✅ Token existe y no está usado
- ✅ Token no ha expirado
- ✅ Email coincide (si está restringido)
- ✅ Usuario autenticado

## 🗄️ Estructura de Base de Datos

### Tabla `invitations`

```sql
CREATE TABLE public.invitations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid REFERENCES app.orgs(id), -- NULL para admin (no pertenece a org específica),
  email            text, -- Opcional: restringe a email específico
  role             text NOT NULL CHECK (role IN ('admin','owner','employee')),
  token_hash       bytea NOT NULL, -- SHA-256 del token
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at          timestamptz, -- NULL = disponible, NOT NULL = usado
  used_by          uuid REFERENCES auth.users(id),
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Índices críticos
CREATE UNIQUE INDEX invitations_token_unique_open
  ON public.invitations(token_hash) WHERE used_at IS NULL;
```

### Tabla `memberships`

```sql
CREATE TABLE public.memberships (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('admin','owner','employee')),
  is_primary      boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id) -- Un usuario por org
);
```

## 🔒 Políticas RLS

### Invitaciones (Restringidas)
```sql
-- Nadie puede leer tokens (previene filtraciones)
CREATE POLICY "inv_no_select" ON public.invitations FOR SELECT USING (false);

-- Solo owners/admins pueden gestionar invitaciones de su org
CREATE POLICY "inv_admin_manage" ON public.invitations
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.org_id = invitations.organization_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );
```

### Membresías (Por Usuario)
```sql
-- Cada usuario ve solo sus propias membresías
CREATE POLICY "memberships_read_own" ON public.memberships
  FOR SELECT USING (user_id = auth.uid());
```

## 🛠️ Scripts de Administración

### Generar Invitación
```javascript
// scripts/create_invitation.js
// Requiere: SUPABASE_URL, SUPABASE_SERVICE_KEY

const token = crypto.randomBytes(32).toString('base64url');
const token_hash = crypto.createHash('sha256').update(token).digest();

await supabase.from('invitations').insert({
  organization_id,
  role,
  token_hash,
  email: emailArg || null,
  expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
});
```

### Verificar Estado
```sql
-- Invitaciones activas
SELECT id, email, role, expires_at, used_at
FROM public.invitations
WHERE used_at IS NULL
  AND now() < expires_at;

-- Membresías por organización
SELECT u.email, m.role, m.is_primary
FROM public.memberships m
JOIN auth.users u ON m.user_id = u.id
WHERE m.org_id = 'your-org-id';
```

## ⚠️ Consideraciones de Seguridad

### Ataques Mitigados
- **Token Leakage**: Hashing previene exposición en dumps de BD
- **Replay Attacks**: Un solo uso + expiración automática
- **Race Conditions**: `FOR UPDATE` en validación atómica
- **Email Spoofing**: Validación de email si está restringido

### Mejores Prácticas
- ✅ Usar HTTPS siempre
- ✅ Service key solo en servidor (nunca en cliente)
- ✅ Tokens con entropía alta (32 bytes)
- ✅ Expiración corta (7 días max)
- ✅ Logs de auditoría en producción

## 🧪 Testing

### Flujo Completo de Testing

1. **Crear organización**
```sql
INSERT INTO app.orgs (name) VALUES ('Test Corp') RETURNING id;
-- Result: abc123-def456-ghi789
```

2. **Generar invitación**
```bash
node scripts/create_invitation.js owner abc123-def456-ghi789 test@example.com
# Output: 🔑 TOKEN: aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE
```

3. **Registrar usuario con token**
```typescript
await signUp('test@example.com', 'password123', 'aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE');
```

4. **Verificar membresía creada**
```sql
SELECT * FROM public.memberships WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'test@example.com'
);
-- Debe retornar: role='owner', org_id='abc123...'
```

### Casos de Error
- ❌ **Token expirado**: `claim_invitation` retorna error
- ❌ **Token usado**: `claim_invitation` retorna error
- ❌ **Email mismatch**: `claim_invitation` retorna error
- ❌ **Usuario no autenticado**: `claim_invitation` retorna error

## 📈 Monitoreo y Auditoría

### Métricas a Monitorear
- Invitaciones creadas vs usadas
- Tasa de expiración de tokens
- Errores en claim_invitation
- Usuarios por organización

### Logs de Auditoría
```sql
-- Invitaciones reclamadas recientemente
SELECT i.email, i.role, i.used_at, u.email as claimed_by
FROM public.invitations i
JOIN auth.users u ON i.used_by = u.id
WHERE i.used_at > now() - interval '24 hours'
ORDER BY i.used_at DESC;
```</contents>
</xai:function_call">**Última actualización:** Octubre 2025</contents>
</xai:function_call name="write">
<parameter name="file_path">instructivos/seguridad-rls.md
