# 🔗 ARREGLAR EL LINK DEL EMAIL DE RECUPERACIÓN

## ❌ EL PROBLEMA

El link en el email te lleva a un error de Supabase en lugar de a tu app:

```
http://localhost:3000/#error=access_denied&error_code=otp_expired
```

**NO debería ir a Supabase, debería ir a tu app.**

---

## ✅ LA SOLUCIÓN EN 4 PASOS

### PASO 1: Abre Supabase Dashboard
Ve aquí:
```
https://app.supabase.com/project/hawpywnmkatwlcbtffrg/auth/templates
```

### PASO 2: Busca "Reset Password"
Verás una lista de templates. Haz click en **"Reset Password"**

### PASO 3: Copia y Pega Este HTML

```html
<h2>Reset Password</h2>

<p>Follow this link to reset the password for your user:</p>

<p><a href="{{ .SiteURL }}/auth/reset-password#access_token={{ .TokenHash }}&type=recovery">Reset Password</a></p>

<p>Alternatively, enter the code: {{ .Token }}</p>
```

**Borra TODO lo que está y reemplázalo con esto**

### PASO 4: Presiona "Save"

---

## 🧪 VERIFICAR QUE FUNCIONA

1. Abre: `http://localhost:3000/test-recovery-route`
2. Ingresa: `iangel.oned@gmail.com`
3. Presiona: "Solicitar Recuperación"
4. Revisa tu email
5. Haz click en el link
6. ✅ Deberías ver la página de cambio de contraseña

---

## 📝 QUÉ HACE CADA PARTE

- `{{ .SiteURL }}` = Tu app (`http://localhost:3000`)
- `{{ .TokenHash }}` = Token encriptado para seguridad
- `{{ .Token }}` = Código de 6 dígitos como alternativa
- `/auth/reset-password` = Tu página para cambiar contraseña

---

## 🎉 RESULTADO

Cuando funciona:

```
Email →  http://localhost:3000/auth/reset-password#access_token=...
↓
Tu página de cambio de contraseña
↓
Usuario cambia contraseña
↓
✅ FUNCIONA PERFECTAMENTE
```

---

**Eso es todo. Solo 4 pasos.**
