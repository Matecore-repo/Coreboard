# Sistema de Autenticación - Coreboard

## Descripción

Sistema completo de autenticación con Supabase que incluye:
- Login con email y contraseña
- Registro con token secreto
- Recuperación de contraseña
- Restauración automática de sesión
- Gestión de estado global con Context API

## Arquitectura

### Componentes principales

#### `AuthContext.tsx`
Contexto global que mantiene:
- `user`: Usuario actual con membresías y organización
- `session`: Sesión activa de Supabase
- `loading`: Estado de carga
- `currentOrgId`: Organización actual del usuario
- `currentRole`: Rol del usuario en la org actual

#### `LoginView.tsx`
Vista con 3 modos:
1. **Login**: Iniciar sesión con email + contraseña
2. **Register**: Crear cuenta con email + contraseña + token secreto
3. **Reset**: Solicitar recuperación de contraseña

#### `ResetPasswordPage.tsx`
Página para actualizar contraseña después de recibir email de recuperación.

#### Rutas de autenticación
- `/auth/callback`: Procesa callbacks de Supabase (confirmación de email, reset)
- `/auth/reset-password`: Página para actualizar contraseña

## Flujos de autenticación

### 1. Login
```
Usuario ingresa email + contraseña
          ↓
LoginView.handleSubmit() → signIn()
          ↓
Supabase valida credenciales
          ↓
✓ Si es correcto: Se genera sesión
  ✗ Si falla: Se muestra error
          ↓
onAuthStateChange dispara
          ↓
Se cargan membresías del usuario
          ↓
Usuario ingresa a la app
```

### 2. Registro
```
Usuario ingresa email + contraseña + token
          ↓
LoginView.handleSubmit() → signUp()
          ↓
Supabase verifica token secreto (hook)
          ↓
✓ Si es válido: Se crea usuario, se envía email
  ✗ Si falla: Se muestra error
          ↓
Usuario recibe email de confirmación
          ↓
Hace clic en link → /auth/callback
          ↓
Usuario inicia sesión automáticamente
```

### 3. Recuperación de contraseña
```
Usuario solicita reset (LoginView, modo reset)
          ↓
resetPassword(email)
          ↓
Supabase envía email con link a /auth/reset-password
          ↓
Usuario hace clic en link
          ↓
Se abre /auth/reset-password
          ↓
Usuario ingresa nueva contraseña (2x confirmación)
          ↓
updatePassword(newPassword)
          ↓
Supabase actualiza contraseña
          ↓
Redirige a /
```

### 4. Restauración automática de sesión
```
App se monta → AuthProvider useEffect
          ↓
supabase.auth.getSession()
          ↓
✓ Si hay sesión activa: Se restaura
✗ Si no: Usuario ve login
          ↓
onAuthStateChange escucha cambios
```

## Métodos del useAuth()

### `signIn(email: string, password: string)`
Inicia sesión con email y contraseña.

```typescript
try {
  await signIn('user@example.com', 'password123');
} catch (error) {
  console.error('Error:', error.message);
}
```

### `signUp(email: string, password: string, signupToken?: string)`
Crea nuevo usuario. El token secreto se valida en la BD.

```typescript
try {
  await signUp('new@example.com', 'password123', 'secret-token-123');
} catch (error) {
  console.error('Error:', error.message);
}
```

### `resetPassword(email: string)`
Envía email de recuperación de contraseña.

```typescript
try {
  await resetPassword('user@example.com');
} catch (error) {
  console.error('Error:', error.message);
}
```

### `updatePassword(newPassword: string)`
Actualiza la contraseña del usuario actual. Se debe usar en `/auth/reset-password`.

```typescript
try {
  await updatePassword('newPassword123');
} catch (error) {
  console.error('Error:', error.message);
}
```

### `signOut()`
Cierra sesión.

```typescript
await signOut();
```

### `signInAsDemo()`
Inicia sesión como usuario demo (sin Supabase).

```typescript
signInAsDemo();
```

### `switchOrganization(org_id: string)`
Cambia la organización activa del usuario.

```typescript
switchOrganization('org-id-123');
```

### `createOrganization(orgData)`
Crea nueva organización y asigna usuario como owner.

```typescript
await createOrganization({
  name: 'Mi Peluquería',
  salonName: 'Salón Principal',
  salonAddress: 'Calle 123, Ciudad',
  salonPhone: '555-1234'
});
```

## Validación del token secreto

El token de registro se valida mediante un hook de Supabase en la función:
```sql
hook_require_signup_token()
```

Este hook verifica que:
1. El token esté registrado en la tabla `signup_tokens`
2. El token no haya sido usado
3. Si es válido, marca el token como usado

## Seguridad

✅ **Implementado:**
- Las contraseñas NO se guardan en localStorage
- La sesión se maneja con tokens JWT seguros de Supabase
- El token secreto se valida en BD (no en frontend)
- Las políticas de Row Level Security protegen los datos
- Solo el usuario autenticado puede acceder a sus membresías

⚠️ **Configuraciones recomendadas en Supabase:**
1. Habilitar "Email Verification" en Auth settings
2. Habilitar "Double password hashing" en Auth settings
3. Configurar SMTP para envío de emails
4. Habilitar "Leaked password protection"

## Variables de entorno

Crear `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
```

## Flujo de usuario nuevo

1. Usuario hace signup
2. Se envía email de confirmación
3. Usuario confirma email → va a /auth/callback
4. Se crea sesión automáticamente
5. `isNewUser` está en true
6. Se muestra onboarding
7. Usuario crea su primera organización/salón
8. `isNewUser` se pone en false

## Manejo de errores

Los errores se muestran con `toast` al usuario:
- "Error al iniciar sesión"
- "Las contraseñas no coinciden"
- "El token secreto es inválido"
- Etc.

Se loguean en consola para debugging.

## Recuperación de sesión perdida

Si un usuario cierra el navegador:
1. El token JWT se guardaba antes en localStorage
2. Supabase lo restaura automáticamente al recargar
3. `AuthProvider` ejecuta `getSession()` al montar
4. Se cargan las membresías

## Testing

### Test 1: Login básico
1. Ir a `/`
2. Cambiar a "Iniciar sesión"
3. Ingresar email y contraseña válidos
4. Verificar que entra a la app

### Test 2: Registro
1. Ir a `/`
2. Cambiar a "Crear cuenta"
3. Ingresar email, contraseña y token secreto
4. Verificar que se envía email
5. Hacer clic en link del email
6. Verificar que se loguea automáticamente

### Test 3: Recuperación de contraseña
1. Ir a `/`
2. Cambiar a "Recuperar contraseña"
3. Ingresar email
4. Ir al email y hacer clic en link
5. Ingresar nueva contraseña (2 veces)
6. Verificar que se actualiza
7. Loguearse con nueva contraseña

### Test 4: Restauración de sesión
1. Loguearse
2. Recargar página
3. Verificar que sigue logueado
4. Cerrar y abrir navegador
5. Verificar que sigue logueado

## Logs de Supabase

Para ver logs de autenticación:
```bash
supabase functions list
supabase functions logs auth
```

O desde el dashboard de Supabase:
- Auth > Logs
- Logs de Edge Functions

## Próximos pasos opcionales

- [ ] Autenticación social (Google, GitHub, etc.)
- [ ] 2FA con TOTP
- [ ] Recuperación de cuenta con backup codes
- [ ] Invitación de empleados por email
- [ ] Rate limiting en login
