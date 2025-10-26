# Guía de Testing - Sistema de Autenticación

## Requisitos previos

1. **Proyecto Supabase activo**: COREBOARD en sa-east-1
2. **Tabla `signup_tokens`**: Debe existir con al menos un token válido
3. **SMTP configurado**: Para envío de emails
4. **App corriendo**: `npm run dev`

## Preparación

### Crear tokens de prueba

En Supabase, ejecutar en la consola SQL:

```sql
-- Crear algunos tokens para testing
INSERT INTO signup_tokens (token, is_used, created_at)
VALUES 
  ('test-token-123', false, now()),
  ('test-token-456', false, now()),
  ('test-token-789', false, now());

-- Verificar que se crearon
SELECT * FROM signup_tokens;
```

### Crear usuario de prueba

```sql
-- Crear usuario en auth (vía Supabase Dashboard)
-- Email: testuser@example.com
-- Password: TestPassword123!

-- Luego crear membresía
INSERT INTO memberships (user_id, org_id, role, is_primary)
VALUES 
  ('USER_ID_FROM_AUTH', 'org-123', 'owner', true);
```

## Tests manuales

### Test 1: Login exitoso

**Prerequisitos**: Usuario existente en auth

**Pasos**:
1. Ir a `http://localhost:3000`
2. Asegurarse que está en modo "Iniciar sesión"
3. Ingresar:
   - Email: `testuser@example.com`
   - Password: `TestPassword123!`
4. Hacer clic en "Iniciar sesión"

**Resultado esperado**:
- ✅ No hay mensaje de error
- ✅ Se redirige a `/` (home)
- ✅ Se cargan los datos del usuario
- ✅ Aparece la app principal

**Verificar en consola**:
```javascript
// En DevTools Console
const { user, session } = useAuth(); // Desde un componente
console.log(user); // Debe mostrar usuario
console.log(session); // Debe mostrar sesión
```

---

### Test 2: Login fallido - contraseña incorrecta

**Pasos**:
1. Ir a `http://localhost:3000`
2. Ingresar:
   - Email: `testuser@example.com`
   - Password: `WrongPassword123!`
3. Hacer clic en "Iniciar sesión"

**Resultado esperado**:
- ✅ Aparece toast rojo: "Error al iniciar sesión"
- ✅ No se redirige
- ✅ Sigue en login

---

### Test 3: Login fallido - usuario no existe

**Pasos**:
1. Ir a `http://localhost:3000`
2. Ingresar:
   - Email: `nonexistent@example.com`
   - Password: `AnyPassword123!`
3. Hacer clic en "Iniciar sesión"

**Resultado esperado**:
- ✅ Aparece toast rojo
- ✅ No se redirige

---

### Test 4: Registro con token válido

**Prerequisitos**: Token válido creado (`test-token-123`)

**Pasos**:
1. Ir a `http://localhost:3000`
2. Hacer clic en "Crear cuenta"
3. Ingresar:
   - Email: `newuser@example.com`
   - Password: `NewPassword123!`
   - Token: `test-token-123`
4. Hacer clic en "Crear cuenta"

**Resultado esperado**:
- ✅ Toast verde: "Registro enviado. Revisa tu email."
- ✅ Vuelve a modo "Iniciar sesión"
- ✅ Email de confirmación llega a `newuser@example.com`

**Verificar email**:
- Ir a Supabase Dashboard > Auth > Emails
- Buscar el email enviado
- Debe tener link a `http://localhost:3000/auth/callback?...`

---

### Test 5: Confirmar email (callback)

**Prerequisitos**: Email de confirmación enviado (Test 4)

**Pasos**:
1. Ir al email que recibió
2. Hacer clic en el link de confirmación
3. Se abrirá `/auth/callback`

**Resultado esperado**:
- ✅ Se ve spinner "Procesando autenticación..."
- ✅ Se redirige a `/` automáticamente
- ✅ Usuario está logueado

**Verificar estado**:
```javascript
const { user, session } = useAuth();
console.log(user?.email); // "newuser@example.com"
console.log(user?.isNewUser); // true
```

---

### Test 6: Registro con token inválido

**Pasos**:
1. Ir a `http://localhost:3000`
2. Hacer clic en "Crear cuenta"
3. Ingresar:
   - Email: `test2@example.com`
   - Password: `Password123!`
   - Token: `invalid-token-xyz`
4. Hacer clic en "Crear cuenta"

**Resultado esperado**:
- ✅ Toast rojo con error
- ✅ No se envía email
- ✅ No se crea usuario

---

### Test 7: Recuperación de contraseña

**Pasos**:
1. Ir a `http://localhost:3000`
2. Hacer clic en "Recuperar contraseña"
3. Ingresar email: `testuser@example.com`
4. Hacer clic en "Enviar recuperación"

**Resultado esperado**:
- ✅ Toast verde: "Te enviamos un email..."
- ✅ Vuelve a modo "Iniciar sesión"
- ✅ Email llega a `testuser@example.com`

**Verificar email**:
- Link debe ir a `http://localhost:3000/auth/reset-password?...`

---

### Test 8: Actualizar contraseña

**Prerequisitos**: Email de reset recibido (Test 7)

**Pasos**:
1. Hacer clic en link del email
2. Se abre `/auth/reset-password`
3. Ingresar:
   - Nueva contraseña: `NewPassword456!`
   - Confirmar: `NewPassword456!`
4. Hacer clic en "Actualizar contraseña"

**Resultado esperado**:
- ✅ Toast verde: "Contraseña actualizada correctamente"
- ✅ Spinner con "Actualizando..."
- ✅ Después 2 segundos redirige a `/`

---

### Test 9: Login con nueva contraseña

**Pasos**:
1. Se redirige a login automáticamente
2. Ingresar:
   - Email: `testuser@example.com`
   - Password: `NewPassword456!` (la nueva)
3. Hacer clic en "Iniciar sesión"

**Resultado esperado**:
- ✅ Se loguea exitosamente
- ✅ Se redirige a home

---

### Test 10: Actualizar contraseña con mismatch

**Pasos**:
1. Ir a `/auth/reset-password` (necesita token válido de Supabase)
2. Ingresar:
   - Nueva contraseña: `Password123!`
   - Confirmar: `DifferentPassword!`
3. Hacer clic en "Actualizar contraseña"

**Resultado esperado**:
- ✅ Texto rojo: "Las contraseñas no coinciden"
- ✅ Botón deshabilitado
- ✅ No se envía formulario

---

### Test 11: Restauración de sesión

**Pasos**:
1. Loguearse (Test 1)
2. Verificar que está en home
3. Recargar página (F5 o Ctrl+R)

**Resultado esperado**:
- ✅ Sigue logueado
- ✅ No redirije a login
- ✅ Los datos del usuario se cargan

---

### Test 12: Cierre de sesión

**Prerequisitos**: Usuario logueado

**Pasos**:
1. Estar en home
2. Abrir DevTools Console y ejecutar:
```javascript
const auth = useAuth();
await auth.signOut();
```
3. O hacer clic en logout si existe en UI

**Resultado esperado**:
- ✅ Se redirige a login
- ✅ localStorage se limpia
- ✅ Refrescar la página = sigue en login

---

## Verificación de Logs

### Ver logs de Auth en Supabase

1. Ir a Dashboard > Project Settings > Logs
2. Filtrar por "auth"
3. Debe mostrar eventos:
   - `user_signup`
   - `user_confirmed`
   - `user_recovery_requested`
   - `user_password_changed`
   - `user_signin`
   - `user_signout`

### Ver logs en consola del navegador

```javascript
// Ejecutar en DevTools Console
localStorage.getItem('sb-session') // Ver sesión guardada
```

---

## Casos Edge

### Edge 1: Session expirada

**Simular**:
1. Loguearse
2. Abrir DevTools > Storage > LocalStorage
3. Eliminar `sb-` items
4. Recargar

**Resultado esperado**:
- ✅ Se redirige a login
- ✅ No hay errores

---

### Edge 2: Dos pestañas

**Pasos**:
1. Abrir 2 pestañas del mismo sitio
2. En pestaña 1: loguearse
3. Ir a pestaña 2

**Resultado esperado**:
- ✅ Pestaña 2 se sincroniza automáticamente
- ✅ Ambas tabs ven al usuario logueado

---

### Edge 3: Logout de una tab afecta otras

**Pasos**:
1. Dos pestañas logueadas
2. En pestaña 1: logout
3. Ir a pestaña 2

**Resultado esperado**:
- ✅ Pestaña 2 se sincroniza
- ✅ Ambas van a login

---

## Checklist de Testing Completo

- [ ] Login con credenciales correctas
- [ ] Login con contraseña incorrecta
- [ ] Login con usuario no existente
- [ ] Registro con token válido
- [ ] Confirmación de email vía callback
- [ ] Registro con token inválido
- [ ] Solicitar recuperación de contraseña
- [ ] Actualizar contraseña vía reset
- [ ] Login con nueva contraseña
- [ ] Validación de contraseñas iguales
- [ ] Restauración automática de sesión
- [ ] Cierre de sesión
- [ ] Logs en Supabase
- [ ] Sincronización entre tabs
- [ ] Manejo de sesión expirada

---

## Debugging

### Habilitar logs de Supabase en consola

```typescript
// En AuthContext.tsx
const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  }
});

// Luego en consola
localStorage.debug = 'supabase:*';
```

### Ver errores completos

```javascript
// En catch blocks, ver error completo:
try {
  await signIn(email, password);
} catch (error) {
  console.error('Full error:', error);
  console.error('Message:', error.message);
  console.error('Code:', error.code);
  console.error('Status:', error.status);
}
```

---

## Notas importantes

⚠️ **No borrar tablas de auth manualmente** - Supabase las gestiona

⚠️ **Tokens expirados**: Por defecto, JWT dura 3600 segundos (1 hora)

⚠️ **Refresh token**: Se usa automáticamente si está disponible

⚠️ **Email en development**: Algunos servicios no envían en localhost

✅ **Test emails**: Usar direcciones de testing de Supabase o servicios mock como Mailtrap
