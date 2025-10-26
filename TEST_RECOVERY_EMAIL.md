# 🧪 Test: Recuperación de Contraseña - DESPUÉS DEL FIX

## ✅ Estado del fix

**Columna `phone` en tabla `profiles`**: Agregada exitosamente ✅

Ahora el flujo de recuperación debería funcionar sin errores.

---

## 🚀 Cómo testear

### Paso 1: Ir a la app

```
http://localhost:3000
```

### Paso 2: Ir a modo "Recuperar contraseña"

1. Ver la pantalla de login
2. Hacer clic en el botón **"Recuperar contraseña"** (abajo)
3. Se mostrará un formulario con un campo de email

### Paso 3: Ingresar email

- Usar email existente en Supabase Auth (ej: `testuser@example.com`)
- O crear un usuario nuevo primero si no tienes

### Paso 4: Enviar recuperación

1. Ingresar email
2. Hacer clic en **"Enviar recuperación"**

### Paso 5: Verificar resultado

**Esperado**:
- ✅ Toast verde: **"Te enviamos un email para recuperar tu contraseña"**
- ✅ Se redirige al modo login
- ✅ Sin errores en la consola
- ✅ **Sin error 500**

### Paso 6: Verificar email

- Ir a la bandeja de email
- Buscar email de Supabase con asunto: **"Reset your password"**
- El email debe contener un link a: `http://localhost:3000/auth/reset-password?...`

### Paso 7: Hacer clic en link

1. Abrir el email
2. Hacer clic en el botón/link de reset
3. Se debería abrir `/auth/reset-password`

### Paso 8: Actualizar contraseña

1. Se abrirá el formulario **"Actualizar contraseña"**
2. Ingresar:
   - Nueva contraseña: `NewPassword123!`
   - Confirmar: `NewPassword123!`
3. Hacer clic en **"Actualizar contraseña"**

### Paso 9: Verificar actualización

**Esperado**:
- ✅ Toast verde: **"Contraseña actualizada correctamente"**
- ✅ Spinner mostrando "Actualizando..."
- ✅ Después 2 segundos, redirige a `/`
- ✅ Finalmente va a login

### Paso 10: Loguearse con nueva contraseña

1. Ingresar email
2. Ingresar: `NewPassword123!` (la nueva contraseña)
3. Hacer clic en **"Iniciar sesión"**

**Esperado**:
- ✅ Se loguea exitosamente
- ✅ Va a home (app principal)

---

## 🔍 Verificar en Console (DevTools)

1. Abrir **F12** o **DevTools**
2. Ir a pestaña **Console**
3. Buscar errors

**Si ves esto**, el fix funcionó:
```
✅ No hay error 500
✅ No hay "Database error updating user"
✅ Solo el toast de éxito
```

**Si ves esto**, aún hay problema:
```
❌ Error 500
❌ "Database error updating user for recovery"
```

---

## 📊 Verificar en logs de Supabase

1. Ir a Supabase Dashboard
2. Project Settings > Logs
3. Filtrar por "auth"
4. Buscar "recover" o "recovery_requested"

**Esperado después del fix**:
- Los nuevos intentos NO deben tener error
- Los antiguos (antes del fix) sí tienen error
- Los logs mostrarán un evento exitoso de recovery

---

## ❌ Si aún da error

### Solución 1: Recargar la página

```
Ctrl+F5 (o Cmd+Shift+R en Mac)
```

### Solución 2: Limpiar cache

- Abrir DevTools
- Click derecho en refresh
- Seleccionar "Empty cache and hard refresh"

### Solución 3: Verificar que la columna existe

En Supabase Console > SQL:

```sql
-- Verificar columna phone
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'phone';

-- Si no aparece, ejecutar:
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;
```

---

## 📝 Resumen del flujo

```
Usuario solicita reset
         ↓
Supabase genera token
         ↓
Actualiza profiles.phone (ahora funciona ✅)
         ↓
Envía email con link
         ↓
Usuario hace clic en link
         ↓
Va a /auth/reset-password
         ↓
Usuario ingresa nueva contraseña
         ↓
updatePassword() ejecutado
         ↓
Contraseña actualizada ✅
         ↓
Redirige a /
         ↓
Usuario logueado con nueva contraseña ✅
```

---

## ✅ Checklist de verificación

- [ ] Console sin errores 500
- [ ] Toast verde de éxito
- [ ] Email de recovery recibido
- [ ] Link del email funciona
- [ ] Página de reset se abre
- [ ] Contraseña se actualiza
- [ ] Loguearse con nueva contraseña funciona
- [ ] Logs de Supabase sin errores

---

**Si todos los items tienen ✅, ¡la recuperación funciona perfectamente!**

---

**Estado**: ✅ LISTO PARA TESTEAR
**Fecha**: Octubre 25, 2025
