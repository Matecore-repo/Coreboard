# 🗄️ Base de Datos - Arquitectura Multi-Tenant

COREBOARD utiliza PostgreSQL con Supabase para una arquitectura multi-tenant robusta con triggers automáticos.

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                    │
├─────────────────────────────────────────────────────────────┤
│  auth.*          │  app.*           │  public.*            │
│  (Autenticación) │  (Core multi-    │  (Tenant data)       │
│  - users         │   tenant)        │  - memberships       │
│  - sessions      │  - orgs          │  - salons            │
│  - tokens        │                  │  - services          │
├──────────────────┼──────────────────┼──────────────────────┤
│  RLS Policies    │  Triggers        │  Functions RPC       │
│  (Security)      │  (Automation)    │  (API)               │
└──────────────────┴──────────────────┴──────────────────────┘
```

## 📊 Esquema Completo

### 🏢 Core Multi-Tenant (`app.*`)

#### Organizaciones (`app.orgs`)
```sql
CREATE TABLE app.orgs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  tax_id          text,                    -- CUIT/CUIL
  settings        jsonb DEFAULT '{}',      -- Config org
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  deleted_at      timestamptz              -- Soft delete
);

-- Índices
CREATE INDEX idx_orgs_name ON app.orgs(name);
CREATE INDEX idx_orgs_deleted ON app.orgs(deleted_at) WHERE deleted_at IS NULL;
```

#### Membresías (`public.memberships`)
```sql
CREATE TABLE public.memberships (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('owner','admin','employee','viewer')),
  is_primary      boolean DEFAULT false,   -- Org principal del usuario
  created_at      timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)                  -- Un usuario por org
);

-- Índices
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_org ON public.memberships(org_id);
CREATE INDEX idx_memberships_role ON public.memberships(role);
```

### 🏪 Datos de Negocio (`public.*`)

#### Salones (`public.salons`)
```sql
CREATE TABLE public.salons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  name            text NOT NULL,
  address         text,
  phone           text,
  timezone        text DEFAULT 'America/Argentina/Buenos_Aires',
  active          boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_salons_org ON public.salons(org_id);
CREATE INDEX idx_salons_active ON public.salons(active) WHERE active = true;
```

#### Servicios (`public.services`)
```sql
CREATE TABLE public.services (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  name             text NOT NULL,
  description      text,
  base_price       numeric NOT NULL DEFAULT 0,
  duration_minutes integer DEFAULT 60,
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_services_org ON public.services(org_id);
CREATE INDEX idx_services_active ON public.services(is_active) WHERE is_active = true;
```

#### Precios por Salón (`public.salon_service_prices`)
```sql
CREATE TABLE public.salon_service_prices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id    uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  service_id  uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price       numeric NOT NULL,                    -- Precio override
  created_at  timestamptz DEFAULT now(),
  UNIQUE(salon_id, service_id)                     -- Un precio por servicio/salón
);

-- Índices
CREATE INDEX idx_salon_prices_salon ON public.salon_service_prices(salon_id);
CREATE INDEX idx_salon_prices_service ON public.salon_service_prices(service_id);
```

#### Empleados (`public.employees`)
```sql
CREATE TABLE public.employees (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name             text NOT NULL,
  email            text,
  phone            text,
  commission_rate  numeric DEFAULT 0.5,           -- 50% default
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_employees_org ON public.employees(org_id);
CREATE INDEX idx_employees_user ON public.employees(user_id);
CREATE INDEX idx_employees_active ON public.employees(is_active) WHERE is_active = true;
```

#### Clientes (`public.clients`)
```sql
CREATE TABLE public.clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text,
  email       text,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_clients_org ON public.clients(org_id);
CREATE INDEX idx_clients_name ON public.clients(name);
CREATE INDEX idx_clients_phone ON public.clients(phone);
```

#### Turnos (`public.appointments`)
```sql
CREATE TABLE public.appointments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  salon_id        uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name     text NOT NULL,                    -- Denormalized
  employee_id     uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  date            date NOT NULL,
  time            time NOT NULL,
  status          text NOT NULL CHECK (status IN ('pending','confirmed','completed','cancelled')),
  total_amount    numeric NOT NULL DEFAULT 0,
  notes           text,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_appointments_org ON public.appointments(org_id);
CREATE INDEX idx_appointments_salon ON public.appointments(salon_id);
CREATE INDEX idx_appointments_date ON public.appointments(date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_employee ON public.appointments(employee_id);
CREATE INDEX idx_appointments_created_by ON public.appointments(created_by);
CREATE INDEX idx_appointments_salon_date ON public.appointments(salon_id, date);
```

#### Ítems de Turno (`public.appointment_items`)
```sql
CREATE TABLE public.appointment_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id      uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price           numeric NOT NULL,                    -- Precio al momento
  quantity        integer DEFAULT 1,
  created_at      timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_appointment_items_appointment ON public.appointment_items(appointment_id);
CREATE INDEX idx_appointment_items_service ON public.appointment_items(service_id);
```

#### Pagos (`public.payments`)
```sql
CREATE TABLE public.payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount          numeric NOT NULL,
  payment_method  text NOT NULL CHECK (payment_method IN ('cash','card','transfer','other')),
  date            date NOT NULL,
  notes           text,
  created_at      timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_payments_org ON public.payments(org_id);
CREATE INDEX idx_payments_appointment ON public.payments(appointment_id);
CREATE INDEX idx_payments_date ON public.payments(date);
```

#### Gastos (`public.expenses`)
```sql
CREATE TABLE public.expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  salon_id        uuid REFERENCES public.salons(id) ON DELETE SET NULL,
  amount          numeric NOT NULL,
  description     text NOT NULL,
  category        text,
  date            date NOT NULL,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_expenses_org ON public.expenses(org_id);
CREATE INDEX idx_expenses_salon ON public.expenses(salon_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_expenses_created_by ON public.expenses(created_by);
```

#### Comisiones (`public.commissions`)
```sql
CREATE TABLE public.commissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  employee_id      uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  appointment_id   uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  amount           numeric NOT NULL,
  commission_rate  numeric NOT NULL,
  date             date NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_commissions_org ON public.commissions(org_id);
CREATE INDEX idx_commissions_employee ON public.commissions(employee_id);
CREATE INDEX idx_commissions_appointment ON public.commissions(appointment_id);
CREATE INDEX idx_commissions_date ON public.commissions(date);
```

### 🎫 Sistema de Invitaciones (`public.invitations`)

```sql
CREATE TABLE public.invitations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
  email            text,                          -- Opcional
  role             text NOT NULL CHECK (role IN ('owner','admin','employee','viewer')),
  token_hash       bytea NOT NULL,                -- SHA-256
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at          timestamptz,
  used_by          uuid REFERENCES auth.users(id),
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Índices críticos de seguridad
CREATE INDEX idx_invitations_org ON public.invitations(organization_id);
CREATE UNIQUE INDEX invitations_token_unique_open
  ON public.invitations(token_hash) WHERE used_at IS NULL;
CREATE UNIQUE INDEX invitations_unique_pending_email
  ON public.invitations(organization_id, email) WHERE used_at IS NULL AND email IS NOT NULL;
```

## ⚙️ Triggers y Automatización

### Trigger: Actualizar `updated_at`

```sql
-- Función helper
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Aplicar a tablas que lo necesitan
CREATE TRIGGER update_orgs_updated_at
  BEFORE UPDATE ON app.orgs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_salons_updated_at
  BEFORE UPDATE ON public.salons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### Trigger: Calcular Total de Turno

```sql
CREATE OR REPLACE FUNCTION public.calculate_appointment_total()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalcular total cuando cambian los items
  UPDATE public.appointments
  SET total_amount = (
    SELECT COALESCE(SUM(ai.price * ai.quantity), 0)
    FROM public.appointment_items ai
    WHERE ai.appointment_id = NEW.appointment_id
  )
  WHERE id = NEW.appointment_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_appointment_total_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.appointment_items
  FOR EACH ROW EXECUTE FUNCTION public.calculate_appointment_total();
```

### Trigger: Generar Comisiones

```sql
CREATE OR REPLACE FUNCTION public.generate_commission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  emp_commission_rate numeric;
  service_amount numeric;
BEGIN
  -- Solo generar comisión cuando turno se completa
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Obtener rate del empleado
    SELECT commission_rate INTO emp_commission_rate
    FROM public.employees
    WHERE id = NEW.employee_id;

    -- Calcular monto de servicios
    SELECT SUM(price * quantity) INTO service_amount
    FROM public.appointment_items
    WHERE appointment_id = NEW.id;

    -- Insertar comisión si hay empleado y monto
    IF emp_commission_rate > 0 AND service_amount > 0 THEN
      INSERT INTO public.commissions (
        org_id, employee_id, appointment_id,
        amount, commission_rate, date
      ) VALUES (
        NEW.org_id, NEW.employee_id, NEW.id,
        service_amount * emp_commission_rate, emp_commission_rate, NEW.date
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_commission_trigger
  AFTER UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.generate_commission();
```

## 🔧 Funciones RPC

### Claim Invitación (Seguro)

```sql
CREATE OR REPLACE FUNCTION public.claim_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_inv public.invitations%ROWTYPE;
  v_hash bytea := digest(p_token, 'sha256');
BEGIN
  -- Validar autenticación
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = 'PT401';
  END IF;

  -- Obtener email del usuario
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  -- Buscar invitación (FOR UPDATE previene race conditions)
  SELECT * INTO v_inv
  FROM public.invitations
  WHERE token_hash = v_hash
    AND used_at IS NULL
    AND now() < expires_at
  FOR UPDATE;

  -- Validar invitación
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired_or_used' USING ERRCODE = 'PT403';
  END IF;

  -- Validar email si está restringido
  IF v_inv.email IS NOT NULL AND lower(v_inv.email) <> lower(v_email) THEN
    RAISE EXCEPTION 'email_mismatch' USING ERRCODE = 'PT403';
  END IF;

  -- Crear membresía (idempotente)
  INSERT INTO public.memberships(org_id, user_id, role)
  VALUES (v_inv.organization_id, v_user_id, v_inv.role)
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Marcar como usada
  UPDATE public.invitations
  SET used_at = now(), used_by = v_user_id
  WHERE id = v_inv.id;

  -- Retornar info
  RETURN jsonb_build_object(
    'organization_id', v_inv.organization_id,
    'role', v_inv.role
  );
END;
$$;
```

### Funciones Helper

```sql
-- Verificar membresía
CREATE OR REPLACE FUNCTION public.user_is_member_of(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND org_id = $1
  );
$$;

-- Verificar rol
CREATE OR REPLACE FUNCTION public.user_has_role_in_org(org_id uuid, required_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = auth.uid() AND org_id = $1 AND role = $2
  );
$$;
```

## 📊 Consultas de Monitoreo

### Estadísticas por Organización
```sql
SELECT
  o.name as org_name,
  COUNT(DISTINCT m.user_id) as total_users,
  COUNT(DISTINCT s.id) as total_salons,
  COUNT(DISTINCT srv.id) as total_services,
  COUNT(DISTINCT a.id) as total_appointments,
  COUNT(DISTINCT c.id) as total_clients
FROM app.orgs o
LEFT JOIN public.memberships m ON o.id = m.org_id
LEFT JOIN public.salons s ON o.id = s.org_id
LEFT JOIN public.services srv ON o.id = srv.org_id
LEFT JOIN public.appointments a ON o.id = a.org_id
LEFT JOIN public.clients c ON o.id = c.org_id
GROUP BY o.id, o.name
ORDER BY total_users DESC;
```

### Rendimiento por Mes
```sql
SELECT
  DATE_TRUNC('month', a.date) as month,
  COUNT(*) as appointments,
  SUM(a.total_amount) as revenue,
  AVG(a.total_amount) as avg_appointment_value
FROM public.appointments a
WHERE a.status = 'completed'
  AND a.date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY DATE_TRUNC('month', a.date)
ORDER BY month DESC;
```

### Usuarios Sin Actividad
```sql
SELECT
  u.email,
  m.role,
  o.name as org_name,
  MAX(a.date) as last_appointment,
  EXTRACT(DAY FROM now() - MAX(a.date)) as days_inactive
FROM auth.users u
JOIN public.memberships m ON u.id = m.user_id
JOIN app.orgs o ON m.org_id = o.id
LEFT JOIN public.appointments a ON u.id = a.created_by
GROUP BY u.id, u.email, m.role, o.name
HAVING MAX(a.date) < CURRENT_DATE - INTERVAL '30 days'
   OR MAX(a.date) IS NULL
ORDER BY days_inactive DESC NULLS FIRST;
```

## 🔄 Migraciones

### Versionado de Schema
```sql
-- Tabla de control de migraciones
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version     text PRIMARY KEY,
  description text NOT NULL,
  applied_at  timestamptz DEFAULT now()
);

-- Insertar versión actual
INSERT INTO public.schema_migrations (version, description)
VALUES ('1.0.0', 'Schema inicial multi-tenant completo')
ON CONFLICT (version) DO NOTHING;
```

### Estrategia de Migraciones
1. **DDL Changes**: Crear nuevas tablas/columnas primero
2. **Data Migration**: Migrar datos existentes
3. **RLS Updates**: Actualizar políticas de seguridad
4. **Cleanup**: Remover código legacy
5. **Testing**: Validar integridad post-migración

## 🚨 Backup y Recovery

### Backup Estratégico
```bash
# Backup completo (ejecutar con service key)
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" \
  --schema=app --schema=public --schema=auth \
  --no-owner --no-privileges --clean \
  > coreboard_backup_$(date +%Y%m%d).sql
```

### Restore Procedure
```sql
-- 1. Crear nueva base si es necesario
-- 2. Restaurar schema
psql [CONNECTION_STRING] < coreboard_backup.sql

-- 3. Verificar integridad
SELECT COUNT(*) FROM app.orgs;
SELECT COUNT(*) FROM public.memberships;
-- etc...

-- 4. Recrear RLS policies si se perdieron
-- (Las policies se incluyen en el dump)
```

## 📈 Optimizaciones

### Índices Estratégicos
```sql
-- Índices para queries comunes
CREATE INDEX CONCURRENTLY idx_appointments_org_date
  ON public.appointments(org_id, date);

CREATE INDEX CONCURRENTLY idx_clients_org_name
  ON public.clients(org_id, name);

-- Índices parciales para estados activos
CREATE INDEX CONCURRENTLY idx_services_org_active
  ON public.services(org_id, name) WHERE is_active = true;
```

### Partitioning (Futuro)
```sql
-- Para tablas grandes como appointments
CREATE TABLE public.appointments_y2025 PARTITION OF public.appointments
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Índices por partición
CREATE INDEX idx_appointments_y2025_date
  ON public.appointments_y2025(date);
```</contents>
</xai:function_call">**Versión:** 1.0.0
**Última actualización:** Octubre 2025</contents>
</xai:function_call name="write">
<parameter name="file_path">instructivos/funcionalidades.md
