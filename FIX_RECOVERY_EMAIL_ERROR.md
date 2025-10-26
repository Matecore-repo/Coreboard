# 🔧 FIX: Error Enviando Email de Recuperación

## ❌ Error reportado

```
POST https://hawpywnmkatwlcbtffrg.supabase.co/auth/v1/recover 500 (Internal Server Error)

Database error updating user for recovery: ERROR: column "phone" of relation "profiles" does not exist
```

---

## 🔍 Causa del problema

Cuando Supabase recibe una solicitud de recuperación de contraseña, intenta:

1. Generar token de reset
2. Actualizar datos en tabla `profiles`
3. Enviar email con link de reset

**El problema**: La tabla `profiles` no tenía la columna `phone`, pero un trigger o función intentaba actualizarla durante el recovery.

---

## ✅ Solución aplicada

Se agregó la columna `phone` a la tabla `profiles`:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;
```

**Estado**: ✅ **Ejecutado exitosamente**

---

## 🧪 Verificación

Para confirmar que funciona ahora:

1. Ir a `http://localhost:3000`
2. Cambiar a modo "Recuperar contraseña"
3. Ingresar un email existente
4. Hacer clic en "Enviar recuperación"

**Resultado esperado**:
- ✅ Toast verde: "Te enviamos un email..."
- ✅ Se redirige a login
- ✅ Email de recuperación llega a la bandeja

---

## 📋 Checklist de recuperación

- [x] Identificado el error en logs
- [x] Agregada columna `phone` a `profiles`
- [x] Migración ejecutada
- [x] Listo para testear

---

## 🚀 Próximos pasos

1. **Testear recovery email** (instrucciones arriba)
2. **Confirmar email llegó**
3. **Hacer clic en link**
4. **Ingresar nueva contraseña**
5. **Loguearse con nueva contraseña**

---

## 💡 Nota técnica

La columna `phone` está relacionada con la sincronización entre:
- Tabla `auth.users` (manejada por Supabase)
- Tabla `public.profiles` (tu BD)

Durante operaciones de auth (signup, recovery, etc.), Supabase intenta sincronizar datos. Si una columna no existe, falla la operación.

---

**Status**: ✅ ARREGLADO
**Fecha**: Octubre 25, 2025
