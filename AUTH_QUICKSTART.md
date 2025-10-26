# 🚀 Autenticación - Quick Start

## ¿Qué se implementó?

Un sistema **completo de autenticación con Supabase** listo para usar:

✅ Login por email + contraseña
✅ Registro con token secreto
✅ Recuperación de contraseña
✅ Restauración automática de sesión
✅ 3 páginas completas
✅ Manejo de errores
✅ TypeScript tipado
✅ Documentado completamente

## 📁 Archivos principales

```
src/contexts/AuthContext.tsx          ← Todo el poder de la auth
src/components/views/LoginView.tsx    ← 3 modos (login/register/reset)
src/components/views/ResetPasswordPage.tsx ← Actualizar contraseña
pages/auth/callback.tsx               ← Callback de Supabase
pages/auth/reset-password.tsx         ← Ruta del reset
```

## 💻 Cómo usar

### En cualquier componente

```typescript
import { useAuth } from '@/contexts/AuthContext';

export function MyComponent() {
  const { user, session, loading, signIn, signOut } = useAuth();

  if (loading) return <div>Cargando...</div>;

  if (!user) return <div>Por favor inicia sesión</div>;

  return (
    <div>
      <h1>Bienvenido {user.email}</h1>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );
}
```

## 🔐 Métodos disponibles

```typescript
// Autenticación
await signIn(email, password)
await signUp(email, password, token)
await resetPassword(email)
await updatePassword(newPassword)
await signOut()

// Organización
switchOrganization(org_id)
await createOrganization({
  name: 'Mi Org',
  salonName: 'Mi Salón',
  salonAddress: 'Calle 123',
  salonPhone: '555-1234'
})

// Demo
signInAsDemo()

// Estado
user                 // Usuario actual
session             // Sesión JWT
loading             // ¿Cargando?
currentOrgId        // Org actual
currentRole         // Rol en org
```

## 🧪 Testing rápido

1. **Ir a home**
   ```
   http://localhost:3000
   ```

2. **Ver login view**
   - 3 botones: Iniciar sesión | Crear cuenta | Recuperar contraseña

3. **Testear cada flujo**
   - Login: email + contraseña
   - Registro: email + contraseña + token
   - Reset: email (recibe link en email)

## ⚠️ Antes de usar

1. **Variables de entorno** en `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
   ```

2. **Tabla `signup_tokens`** creada en BD

3. **SMTP configurado** en Supabase para emails

4. **Email confirmation** habilitado en Auth Settings (opcional)

## 📚 Documentación completa

- `AUTENTICACION.md` - Sistema completo
- `GUIA_TESTING_AUTENTICACION.md` - 12 tests manuales
- `RESUMEN_AUTENTICACION.md` - Resumen ejecutivo

## 🎯 Flujos principales

### Login
```
usuario@email.com + password → ✅ Entra a app
```

### Registro
```
email + password + token → Email enviado → Confirma → ✅ Logueado
```

### Reset
```
email → Email con link → Ingresa nueva contraseña → ✅ Actualizado
```

## 🚀 Próxima vez que uses

1. **Importar hook**
   ```typescript
   import { useAuth } from '@/contexts/AuthContext';
   ```

2. **Usar en componente**
   ```typescript
   const { user, signIn, signOut } = useAuth();
   ```

3. **Listo**
   ```typescript
   if (user) return <App />;
   return <LoginView />;
   ```

## ❌ Errores comunes

### "signIn is not defined"
- ✅ Asegurate de usar `useAuth()` dentro de `AuthProvider`

### "Email no llega"
- ✅ Configurar SMTP en Supabase > Project Settings > Email

### "Token no funciona"
- ✅ Crear token en tabla `signup_tokens` con `is_used = false`

### "Sesión no se restaura"
- ✅ Verificar que localStorage no está bloqueado
- ✅ Ver logs en DevTools > Storage

## 📱 URLs importantes

```
/ o /index.tsx         ← Home (protected)
/auth/callback         ← Email confirmation
/auth/reset-password   ← Reset password
```

## 💡 Tips

1. **Proteger rutas**
   ```typescript
   if (!user && !loading) return <Redirect to="/" />;
   ```

2. **Mostrar spinner**
   ```typescript
   if (loading) return <Spinner />;
   ```

3. **Demo mode**
   ```typescript
   signInAsDemo();  // Sin Supabase
   ```

4. **Ver estado actual**
   ```typescript
   const auth = useAuth();
   console.log(auth);  // Todo el estado
   ```

## 🎉 ¡Listo!

El sistema está completo, documentado y testeado. ¡A usarlo!

---

**Para más detalles**: Ver `AUTENTICACION.md`
**Para testing**: Ver `GUIA_TESTING_AUTENTICACION.md`
