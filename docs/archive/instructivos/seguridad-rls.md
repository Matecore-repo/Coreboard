# 🔒 Seguridad RLS - Row Level Security

COREBOARD implementa **Row Level Security (RLS)** enterprise-grade para aislamiento completo multi-tenant.

## 🎯 Principios de Seguridad

### Aislamiento por Organización
- Cada usuario ve **SOLO datos de sus organizaciones**
- Políticas RLS en **todas las tablas** críticas
- Validación a nivel de base de datos (no solo UI)

### Defense in Depth
- ✅ RLS como primera línea de defensa
- ✅ Validación en aplicación
- ✅ Autenticación robusta
- ✅ Auditoría completa

## 🏗️ Arquitectura RLS

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   auth.users    │    │ memberships     │    │   app.orgs      │
│   (Supabase)    │◄──►│ (user↔org)     │◄──►│   (tenants)      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  RLS Policies   │    │  Helper Funcs   │    │  Role Checks    │
│  (tenant iso-   │    │  (user_is_      │    │  (owner/admin/   │
│   lation)       │    │   member_of)    │    │   employee)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Políticas RLS por Tabla

### 🏢 Organizaciones (`app.organizations`)

```sql
-- Lectura: Solo miembros de la org
CREATE POLICY "orgs_read_members" ON app.organizations
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM app.memberships
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Escritura: Solo owners pueden modificar
CREATE POLICY "orgs_write_owners" ON app.organizations
  FOR ALL USING (
    id IN (
      SELECT org_id FROM app.memberships
      WHERE user_id = auth.uid()
        AND role = 'owner'
    )
  );
```

### 👥 Membresías (`app.memberships`)

```sql
-- Lectura: Solo las propias membresías
CREATE POLICY "memberships_read_own" ON app.memberships
  FOR SELECT USING (user_id = auth.uid());

-- Gestión: Owners pueden invitar, admins pueden modificar
CREATE POLICY "memberships_manage_admins" ON app.memberships
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM app.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
```

### 🏪 Salones (`app.salons`)

```sql
-- Acceso completo para miembros de la org
CREATE POLICY "salons_org_access" ON app.salons
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM app.memberships
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Eliminación: Solo owners/admins
CREATE POLICY "salons_delete_restricted" ON app.salons
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM app.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
```

### ✂️ Servicios (`app.services`)

```sql
-- Acceso completo para miembros de la org
CREATE POLICY "services_org_access" ON app.services
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM app.memberships
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Modificación: Owners/admins
CREATE POLICY "services_modify_restricted" ON app.services
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM app.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
```

### 👷 Empleados (`app.employees`)

```sql
-- Lectura: Todos los miembros de la org ven empleados
CREATE POLICY "employees_org_read" ON app.employees
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM app.memberships
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL  -- Solo activos
    AND user_id IS NOT NULL  -- Regla de oro: debe tener user_id
    AND active = true  -- Solo empleados activos
  );

-- Gestión: Solo owners/admins
CREATE POLICY "employees_manage_admins" ON app.employees
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM app.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
    AND user_id IS NOT NULL  -- Regla de oro: no permitir sin user_id
  );
```

### 🏪 Asignaciones Salón-Empleado (`public.salon_employees`)

```sql
-- Lectura: Miembros de la org del salón
CREATE POLICY "salon_employees_read" ON public.salon_employees
  FOR SELECT USING (
    salon_id IN (
      SELECT id FROM app.salons
      WHERE org_id IN (
        SELECT org_id FROM app.memberships
        WHERE user_id = auth.uid()
      )
    )
    AND active = true  -- Solo asignaciones activas
  );

-- Gestión: Solo owners/admins
CREATE POLICY "salon_employees_manage_admins" ON public.salon_employees
  FOR ALL USING (
    salon_id IN (
      SELECT id FROM app.salons
      WHERE org_id IN (
        SELECT org_id FROM app.memberships
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
      )
    )
  );
```

### 👥 Clientes (`public.clients`)

```sql
-- Acceso completo para miembros de la org
CREATE POLICY "clients_org_access" ON public.clients
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

-- Creación: Cualquier miembro puede crear clientes
CREATE POLICY "clients_create_members" ON public.clients
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );
```

### 📅 Turnos (`public.appointments`)

```sql
-- Lectura: Miembros de la org del salón
CREATE POLICY "appointments_org_read" ON public.appointments
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

-- Creación: Cualquier miembro puede crear turnos
CREATE POLICY "appointments_create_members" ON public.appointments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Modificación: Cualquier miembro puede modificar turnos de su org
CREATE POLICY "appointments_modify_members" ON public.appointments
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );
```

### 💰 Pagos (`public.payments`)

```sql
-- Acceso completo para miembros de la org
CREATE POLICY "payments_org_access" ON public.payments
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

-- Creación: Solo owners/admins
CREATE POLICY "payments_create_restricted" ON public.payments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
```

### 💸 Gastos (`public.expenses`)

```sql
-- Lectura: Todos los miembros ven gastos
CREATE POLICY "expenses_org_read" ON public.expenses
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
  );

-- Creación: Cualquier miembro puede registrar gastos
CREATE POLICY "expenses_create_members" ON public.expenses
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Modificación: Solo owners/admins
CREATE POLICY "expenses_modify_restricted" ON public.expenses
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
```

### 🎫 Invitaciones (`public.invitations`)

```sql
-- NINGÚN SELECT: Previene filtración de tokens
CREATE POLICY "invitations_no_select" ON public.invitations
  FOR SELECT USING (false);

-- Gestión: Solo owners/admins de la org
CREATE POLICY "invitations_admin_manage" ON public.invitations
  FOR ALL USING (
    organization_id IN (
      SELECT org_id FROM app.memberships
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
```

## 🔧 Funciones Helper

### Verificar Membresía

```sql
-- Función para verificar si usuario es miembro de org
CREATE OR REPLACE FUNCTION public.user_is_member_of(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.memberships
    WHERE user_id = auth.uid()
      AND org_id = $1
  );
$$;

-- Función para verificar rol específico
CREATE OR REPLACE FUNCTION public.user_has_role_in_org(org_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.memberships
    WHERE user_id = auth.uid()
      AND org_id = $1
      AND role = $2
  );
$$;
```

### Uso en Políticas

```sql
-- Ejemplo simplificado usando helper
CREATE POLICY "services_org_access" ON app.services
  FOR ALL USING (user_is_member_of(org_id));

CREATE POLICY "services_modify_admin" ON app.services
  FOR UPDATE USING (user_has_role_in_org(org_id, 'admin'));
```

## 🎭 Matriz de Permisos por Rol

| Tabla/Acción | owner | admin | employee | viewer |
|--------------|-------|-------|----------|--------|
| **Organizaciones** | ✅ CRUD | ❌ | ❌ | ❌ |
| **Membresías** | ✅ CRUD | ✅ Invitar | ❌ | ❌ |
| **Salones** | ✅ CRUD | ✅ CRUD | ✅ Ver | ✅ Ver |
| **Servicios** | ✅ CRUD | ✅ CRUD | ✅ Ver | ✅ Ver |
| **Empleados** | ✅ CRUD | ✅ CRUD | ✅ Ver | ✅ Ver |
| **Clientes** | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ Ver |
| **Turnos** | ✅ CRUD | ✅ CRUD | ✅ CRUD | ✅ Ver |
| **Pagos** | ✅ CRUD | ✅ CRUD | ❌ | ❌ |
| **Gastos** | ✅ CRUD | ✅ CRUD | ✅ Crear | ✅ Ver |
| **Invitaciones** | ✅ CRUD | ✅ CRUD | ❌ | ❌ |

## 🧪 Testing de Seguridad

### Tests de Aislamiento

```sql
-- Test 1: Usuario A no ve datos de Usuario B
-- (Ejecutar como usuario A)
SELECT COUNT(*) FROM public.clients WHERE org_id NOT IN (
  SELECT org_id FROM app.memberships WHERE user_id = auth.uid()
);
-- Debe retornar 0

-- Test 2: Employee no puede crear pagos
-- (Ejecutar como employee)
INSERT INTO public.payments (org_id, appointment_id, amount, payment_method, date)
VALUES ('org-id', NULL, 1000, 'cash', CURRENT_DATE);
-- Debe fallar con RLS violation
```

### Bypass Prevention

```sql
-- Test 3: Verificar que no se puede acceder directamente
-- Intentar SELECT sin WHERE org_id
SELECT * FROM public.clients LIMIT 1;
-- Debe retornar vacío o error

-- Test 4: Verificar foreign keys protegidas
INSERT INTO public.services (org_id, name, base_price)
VALUES ('invalid-org-id', 'Test Service', 100);
-- Debe fallar por RLS (no acceso a org inválida)
```

## ⚠️ Consideraciones Críticas

### Performance
- ✅ Índices en `org_id` y `user_id`
- ✅ Subqueries optimizadas
- ✅ Cache de membresías en aplicación

### Auditoría
- ✅ Todas las operaciones logueadas
- ✅ Triggers para cambios sensibles
- ✅ Alertas en accesos no autorizados

### Edge Cases
- ✅ Usuarios sin membresías (bloqueados)
- ✅ Órganos sin miembros (permitido para setup)
- ✅ Transferencia de ownership
- ✅ Eliminación en cascada

### Mantenimiento
```sql
-- Verificar políticas activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Desactivar RLS temporalmente (SOLO para mantenimiento)
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
-- ... hacer mantenimiento ...
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
```

## 🚨 Respuesta a Incidentes

### Violación de RLS Detectada
1. **Inmediato**: Desactivar usuario sospechoso
2. **Auditoría**: Revisar logs de acceso
3. **Mitigación**: Actualizar políticas si hay brecha
4. **Prevención**: Añadir validaciones adicionales

### Recuperación
```sql
-- Reset permisos si hay problema
DROP POLICY IF EXISTS "problematic_policy" ON public.table_name;
CREATE POLICY "fixed_policy" ON public.table_name ...;

-- Reindexar si hay performance issues
REINDEX INDEX CONCURRENTLY idx_table_org_id;
```

## 📊 Monitoreo

### Queries de Monitoreo
```sql
-- Políticas por tabla
SELECT tablename, COUNT(*) as policies_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- RLS violations (si se loguean)
SELECT * FROM audit_logs
WHERE action = 'RLS_VIOLATION'
ORDER BY created_at DESC LIMIT 100;

-- Usuarios sin membresías (potencial problema)
SELECT u.email, u.created_at
FROM auth.users u
LEFT JOIN app.memberships m ON u.id = m.user_id
WHERE m.id IS NULL
  AND u.created_at < now() - interval '1 hour';

-- Empleados sin user_id (violación de regla de oro)
SELECT e.id, e.full_name, e.email, o.name as org_name
FROM app.employees e
JOIN app.organizations o ON e.org_id = o.id
WHERE e.user_id IS NULL
  AND e.deleted_at IS NULL
ORDER BY o.name, e.full_name;
```

**Versión:** 2.0.0
**Última actualización:** Noviembre 2025

## 📋 Cambios Recientes (v2.0.0)

### Validaciones de Empleados en RLS
- ✅ **Regla de oro**: Políticas RLS verifican `user_id IS NOT NULL`
- ✅ **Tabla `salon_employees`**: Políticas RLS para asignaciones
- ✅ **Validación en triggers**: `validate_appointment()` valida asignación antes de insertar turno
