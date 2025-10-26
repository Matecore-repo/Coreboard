# 📧 CONFIGURAR EMAIL TEMPLATE - GUÍA PASO A PASO

## 🎯 El Problema

El email de recuperación redirige al endpoint incorrecto de Supabase en lugar de redirigir a tu app.

**Lo que pasa ahora:**
```
Email → https://hawpywnmkatwlcbtffrg.supabase.co/auth/v1/verify?token=... 
↓
Error: access_denied, otp_expired
❌ NO FUNCIONA
```

**Lo que debería pasar:**
```
Email → http://localhost:3000/auth/reset-password#access_token=...
↓
ResetPasswordPage recibe el token
↓
Usuario cambia contraseña
✅ FUNCIONA
```

---

## 🔧 SOLUCIÓN: Configurar Template Personalizado

### Paso 1: Abre el Dashboard de Supabase
```
https://app.supabase.com/project/hawpywnmkatwlcbtffrg/auth/templates
```

### Paso 2: Busca "Reset Password"
En la lista de templates, encuentra y haz click en **"Reset Password"**

### Paso 3: Edita el Contenido

**Reemplaza TODO EL CONTENIDO** con esto:

```html
<h2>Reset Password</h2>

<p>Follow this link to reset the password for your user:</p>

<p><a href="{{ .SiteURL }}/auth/reset-password#access_token={{ .TokenHash }}&type=recovery">Reset Password</a></p>

<p>Alternatively, enter the code: {{ .Token }}</p>
```

### Paso 4: Guarda los Cambios
Presiona el botón **"Save"** (Guardar)

---

## ✅ Verificar que Funcionó

### Prueba 1: Ve al test
```
http://localhost:3000/test-recovery-route
```

### Prueba 2: Ingresa el email
```
iangel.oned@gmail.com
```

### Prueba 3: Presiona "Solicitar Recuperación"

### Prueba 4: Revisa tu email
Verás un email con un link que dice:
- **"Reset Password"** 
- O el token de 6 dígitos

### Prueba 5: Haz click en el link
**Deberías ser redirigido a:**
```
http://localhost:3000/auth/reset-password
```

✅ **Si ves esta página, ¡FUNCIONA!**

---

## 📊 QUÉ SIGNIFICA CADA PARTE

| Variable | Qué es | Ejemplo |
|----------|--------|---------|
| `{{ .SiteURL }}` | Tu URL de app | `http://localhost:3000` |
| `{{ .TokenHash }}` | Token hasheado para el URL | `abc123def456...` |
| `{{ .Token }}` | Código OTP de 6 dígitos | `123456` |

---

## 🚨 IMPORTANTE: Si No Ves los Cambios

El template también se puede configurar vía **Supabase CLI local**:

### Opción: Configurar en supabase/config.toml

Si usas Supabase local, edita `supabase/config.toml`:

```toml
[auth.email.template.recovery]
subject = "Reset Your Password"
content_path = "./supabase/templates/recovery.html"
```

Crea el archivo `supabase/templates/recovery.html`:

```html
<h2>Reset Password</h2>

<p>Follow this link to reset the password for your user:</p>

<p><a href="{{ .SiteURL }}/auth/reset-password#access_token={{ .TokenHash }}&type=recovery">Reset Password</a></p>

<p>Alternatively, enter the code: {{ .Token }}</p>
```

Luego reinicia los contenedores:
```bash
supabase stop && supabase start
```

---

## ✨ Resultado Final

Una vez configurado, cuando el usuario:

1. ✅ Solicita recuperación
2. ✅ Recibe email con link correcto
3. ✅ Haz click en link
4. ✅ Va a `/auth/reset-password` con el token
5. ✅ Ve el formulario para cambiar contraseña
6. ✅ Cambia la contraseña
7. ✅ Puede login con la nueva contraseña

**¡TODO FUNCIONA! 🎉**

---

## 🔗 Documentación Oficial

- [Email Templates - Supabase Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Template Variables](https://supabase.com/docs/guides/auth/auth-email-templates#template-variables)
