# 🔐 Test Recuperación de Contraseña - Paso a Paso

## ¿Cómo usar el test?

### 1. Acceder al test
```
http://localhost:3000/test-recovery-route
```

### 2. Workflow Automático

El test te guiará a través de 3 pasos:

#### **PASO 1: Solicitar Recuperación**
- Ingresa un email de una cuenta existente
- Presiona "📧 Solicitar Recuperación"
- El test verifica que el email exista (si puede)
- Luego envía el email de recuperación automáticamente

**Esperado en consola:**
```
✅ Email encontrado: usuario@ejemplo.com
✅ Email de recuperación enviado exitosamente
```

---

#### **PASO 2: Verificar Email y Cambiar Contraseña**

Se te mostrarán instrucciones en pantalla:

1. **📬 Revisa tu email** (bandeja de entrada o spam)
   - Busca un email de: `noreply@auth.hawpywnmkatwlcbtffrg.supabase.co`

2. **🔗 Haz click en el link** de recuperación
   - Verá algo como: `http://localhost:3000/auth/reset-password#access_token=...`

3. **📝 En la página `/auth/reset-password`:**
   - Se abrirá una página blanca que dice: "Escribe tu nueva contraseña"
   - Ingresa la NUEVA contraseña que desees
   - Presiona el botón
   - ✅ Deberías ver un mensaje: "Contraseña actualizada con éxito"

---

#### **PASO 3: Verificar el Cambio**

De vuelta en este test:

1. **🔑 Copia la contraseña nueva** que acabas de escribir
2. **📋 Pégala en el campo** "Escribe la nueva contraseña que pusiste"
3. **📋 Repítela** en "Confirma la contraseña"
4. **✅ Presiona** "Verificar Cambio de Contraseña"

**Si todo funciona:**
- El test intentará hacer login con esa contraseña
- Si es exitoso, verás:

```
✅ ¡ÉXITO! Login exitoso con la nueva contraseña
📌 Usuario: usuario@ejemplo.com
🔑 Session ID: eyJhbGciOiJI...

═══════════════════════════════════════════════════
✨ FLUJO DE RECUPERACIÓN COMPLETADO CORRECTAMENTE ✨
═══════════════════════════════════════════════════
```

---

## 🐛 Si Algo Sale Mal

### Error: "Email de recuperación no se envió"
**Causas posibles:**
- ❌ El email NO existe en la base de datos
- ❌ Supabase está bloqueando (revisa logs de auth en Supabase console)
- ❌ Faltan columnas en `profiles` (pero ya las agregamos)

**Solución:** Ve a `https://app.supabase.com/project/hawpywnmkatwlcbtffrg/logs/auth` y busca el error

### Error: "No se pudo iniciar sesión"
**Causas posibles:**
- ❌ La contraseña está mal (no coinciden)
- ❌ No completaste el paso 2 (cambio en `/auth/reset-password`)
- ❌ Escribiste la contraseña equivocada

**Solución:** Repite desde el Paso 2, prestando atención a qué contraseña escribes

### La página `/auth/reset-password` está en blanco
**Es normal**, debe decir algo como:
```
Escribe tu nueva contraseña
[Input field]
[Botón Cambiar]
```

Si no ves nada, abre F12 (consola) y busca errores

---

## 📊 Qué Sucede Behind the Scenes

1. **Te envía un email** con un link especial que contiene:
   - `access_token` (válido por 1 hora)
   - `type=recovery`

2. **Cuando abres el link**, el token se carga en el navegador

3. **En `/auth/reset-password`:**
   - Detecta el token en la URL
   - Te permite escribir una nueva contraseña
   - Llama a `supabase.auth.updateUser({ password: nuevaPassword })`

4. **Supabase actualiza:**
   - La contraseña en `auth.users`
   - Los timestamps de recuperación en `profiles`
   - La sesión del usuario

5. **Vuelves al test y verificas** con un login normal

---

## ✅ Checklist Antes de Empezar

- [ ] La base de datos tiene las columnas en `profiles` (ya las agregamos)
- [ ] Tienes una cuenta creada (o 10 tokens para crear)
- [ ] Puedes acceder al email que usarás
- [ ] Tienes la app corriendo en `http://localhost:3000`

---

## 🎯 Resumen del Flujo

```
Test en /test-recovery-route
         ↓
      Ingresar email
         ↓
    Solicitar recuperación (Test automático)
         ↓
    Email llega (Acción manual)
         ↓
    Click en link del email (Acción manual)
         ↓
    Se abre /auth/reset-password (Automático)
         ↓
    Escribes nueva contraseña (Acción manual)
         ↓
    Vuelves al test y confirmas (Acción manual)
         ↓
    Test intenta login (Test automático)
         ↓
    ✅ ÉXITO o ❌ ERROR
```

---

## 💡 Tips

- Usa una contraseña fácil para testing (ej: `Test12345`)
- Si la bandeja está llena, revisa spam
- El link del email **expira en 1 hora**
- Si cierras el navegador, la sesión en `/auth/reset-password` se pierda (abre el link de nuevo)
- Los logs en consola (F12) te ayudan a debuggear

