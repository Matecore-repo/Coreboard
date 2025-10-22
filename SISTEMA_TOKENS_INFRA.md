# Sistema de Tokens Secretos - COREBOARD

## 🔐 Cómo Funciona el Sistema de Tokens

### Flujo de Registro con Token
1. **Usuario intenta registrarse** → App pide email, contraseña y token secreto
2. **Validación del token** → Hook `before-user-created` verifica que el token existe y es válido
3. **Creación del usuario** → Si token es válido, se crea el usuario en `auth.users`
4. **Marcado como usado** → Hook `after-user-created` marca el token como usado
5. **Confirmación por email** → Usuario recibe email de confirmación

### Campos del Token
- `id`: UUID único del token
- `token`: String único que se entrega al usuario (ej: "test-token-123")
- `description`: Descripción del token (opcional)
- `is_used`: Boolean - si ya fue usado
- `used_by`: UUID del usuario que usó el token
- `expires_at`: Fecha de expiración (opcional)
- `created_at`: Fecha de creación
- `used_at`: Fecha de uso

## 🏗️ Infraestructura

### Base de Datos (PostgreSQL)
- **Tabla principal**: `public.signup_tokens`
- **RLS habilitado**: Solo admins pueden gestionar tokens
- **Índices**: Token único, búsquedas por estado

### Hooks de Supabase Auth
- **Before User Created**: Valida token antes de crear usuario
- **After User Created**: Marca token como usado
- **Permisos**: Solo `supabase_auth_admin` puede ejecutar

### Frontend (React/Next.js)
- **Campo adicional**: Token secreto en formulario de registro
- **Validación**: Email, contraseña y token requeridos
- **Envío**: Token se envía como `user_metadata.signup_token`

## 📊 Esquema de Base de Datos

### Tabla: `public.signup_tokens`
```sql
CREATE TABLE public.signup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  description text,
  is_used boolean NOT NULL DEFAULT false,
  used_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz
);
```

### Funciones de Validación
```sql
-- Valida token antes de crear usuario
CREATE FUNCTION public.hook_require_signup_token(event jsonb)
RETURNS jsonb

-- Marca token como usado después de crear usuario  
CREATE FUNCTION public.hook_mark_token_used(event jsonb)
RETURNS jsonb
```

## 🔧 Configuración en Supabase Dashboard

### 1. Activar Hooks
- **Auth → Hooks → Before user created**
  - Tipo: Postgres function
  - Función: `public.hook_require_signup_token`

- **Auth → Hooks → After user created**
  - Tipo: Postgres function
  - Función: `public.hook_mark_token_used`

### 2. Configurar Auth
- **Auth → Providers → Email**: Habilitado
- **Auth → Settings**: Confirmación por email habilitada
- **Auth → Templates**: Configurar plantillas de email

## 🎯 Operativa del Sistema

### Para el Administrador
1. **Crear token**: Insertar en `public.signup_tokens`
2. **Entregar token**: Dar al usuario el string del token
3. **Monitorear uso**: Ver qué tokens fueron usados y por quién

### Para el Usuario
1. **Recibir token**: Del administrador
2. **Registrarse**: Ingresar email, contraseña y token
3. **Confirmar email**: Hacer clic en el enlace de confirmación
4. **Acceder**: Iniciar sesión normalmente

## 📝 Comandos SQL Útiles

### Crear Token
```sql
INSERT INTO public.signup_tokens (token, description, expires_at) 
VALUES ('mi-token-123', 'Token para Juan Pérez', now() + interval '7 days');
```

### Ver Tokens Disponibles
```sql
SELECT token, description, expires_at, is_used 
FROM public.signup_tokens 
WHERE is_used = false AND (expires_at IS NULL OR expires_at > now());
```

### Ver Tokens Usados
```sql
SELECT st.token, st.description, st.used_at, au.email as user_email
FROM public.signup_tokens st
JOIN auth.users au ON st.used_by = au.id
WHERE st.is_used = true;
```

### Limpiar Tokens Expirados
```sql
DELETE FROM public.signup_tokens 
WHERE expires_at < now() AND is_used = false;
```

## 🚨 Seguridad

### Medidas Implementadas
- **RLS habilitado**: Solo admins pueden gestionar tokens
- **Tokens únicos**: No se pueden duplicar
- **Expiración**: Tokens pueden tener fecha de vencimiento
- **Uso único**: Cada token solo se puede usar una vez
- **Validación server-side**: Hooks validan en el servidor, no en el cliente

### Buenas Prácticas
- **Tokens seguros**: Usar strings largos y aleatorios
- **Expiración corta**: Máximo 30 días para tokens
- **Monitoreo**: Revisar tokens usados regularmente
- **Rotación**: Generar nuevos tokens periódicamente

## 🔄 Flujo Completo

```
1. Admin crea token en DB
   ↓
2. Admin entrega token al usuario
   ↓
3. Usuario se registra con token
   ↓
4. Hook valida token (válido + no usado + no expirado)
   ↓
5. Supabase crea usuario en auth.users
   ↓
6. Hook marca token como usado
   ↓
7. Usuario recibe email de confirmación
   ↓
8. Usuario confirma email y puede acceder
```

## 📋 Checklist de Implementación

- [x] Tabla `signup_tokens` creada
- [x] Funciones de validación creadas
- [x] Frontend actualizado con campo token
- [x] AuthContext actualizado para enviar token
- [x] Token de prueba creado
- [ ] Hooks activados en Dashboard
- [ ] Plantillas de email configuradas
- [ ] Pruebas de registro realizadas
