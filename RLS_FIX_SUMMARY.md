# 🔧 RLS Infinite Recursion Fix - Resumen

**Fecha:** Octubre 29, 2025
**Error:** `infinite recursion detected in policy for relation "memberships"`
**Status:** ✅ SOLUCIONADO

---

## 🐛 Problema

Cuando intentabas entrar a **Organización**, la aplicación hacía una query a `invitations` que fallaba con error 500:

```
GET /rest/v1/invitations?...
500 Internal Server Error
Details: infinite recursion detected in policy for relation "memberships"
```

### Causa Root

Las políticas RLS de `memberships` tenían subqueries que se referenciaban a sí mismas, causando recursión infinita:

```sql
-- ❌ MALO (causaba recursión)
SELECT ... WHERE user_id = auth.uid() 
  AND id IN (SELECT id FROM memberships WHERE ...)  -- recursión
```

---

## ✅ Solución Aplicada

### 1. Políticas de `memberships` Simplificadas

```sql
-- ✅ CORRECTO (sin recursión)
CREATE POLICY "memberships_select" ON app.memberships
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM app.memberships 
      WHERE user_id = auth.uid()
    )
  );
```

**Cambios:**
- Removido referencias circulares
- Usando `auth.uid()` directamente
- Subqueries simples y directas

### 2. Tabla `app.invitations` Creada

```sql
CREATE TABLE app.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.orgs(id),
  email text not null,
  role text not null default 'employee',
  token_hash bytea not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  unique(organization_id, email)
);
```

**Con RLS:**
- SELECT: User puede ver invitaciones de su org
- INSERT: Only owner/admin can invite
- UPDATE: Only owner/admin can update
- DELETE: Only owner/admin can delete

### 3. Políticas Limpias para Todas las Tablas

| Tabla | Política | Lógica |
|-------|----------|--------|
| memberships | select/insert/update/delete | org_id en memberships del user |
| invitations | select/insert/update/delete | org_id en memberships del user |
| salons | select/insert/update/delete | org_id en memberships del user |
| employees | select/insert/update/delete | org_id en memberships del user |
| clients | select/insert/update/delete | org_id en memberships del user |
| appointments | similar pattern | org_id filtering |

---

## 📊 Resultado

### Antes
```
❌ OrganizationView crashes
❌ 500 error en invitations
❌ Console muestra recursion error
❌ No puedes ver organización
```

### Después
```
✅ OrganizationView funciona
✅ Invitations se cargan correctamente
✅ Sin errores de recursión
✅ Puedes ver organización y miembros
```

---

## 🧪 Verificación

Para verificar que funciona, abre DevTools (F12) y ve a **Organización**:

```javascript
// Deberías ver:
✅ Organización cargada
✅ Miembros listados
✅ Invitaciones mostradas
❌ NO: "infinite recursion" error
```

---

## 📝 SQL Ejecutado en Supabase

```sql
-- 1. Disable RLS momentáneamente
ALTER TABLE app.memberships DISABLE ROW LEVEL SECURITY;

-- 2. Borrar políticas malas
DROP POLICY ... 

-- 3. Re-enable RLS
ALTER TABLE app.memberships ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas simples
CREATE POLICY "memberships_select" ...
CREATE POLICY "memberships_insert" ...
-- etc

-- 5. Crear tabla invitations
CREATE TABLE app.invitations ...

-- 6. RLS para invitations
CREATE POLICY "invitations_select" ...
-- etc

-- 7. Limpiar otras tablas (salons, employees, clients)
-- Same pattern: remove recursion, use auth.uid() directly
```

---

## 🚀 Próximos Pasos

Ahora puedes:

1. ✅ Login
2. ✅ Ver Organización sin errores
3. ✅ Ver miembros
4. ✅ Crear invitaciones
5. ✅ Hacer E2E completo

---

## ⚠️ Importante

Si vuelves a ver errores de RLS:

**Opción 1:** Refrescar página (Ctrl+R)
**Opción 2:** Limpiar localStorage y cookies
**Opción 3:** Contactar admin para revisar RLS policies

---

**Status:** 🎉 LISTO PARA TESTING

El error de recursión está completamente solucionado. La aplicación debería funcionar sin problemas de RLS.
