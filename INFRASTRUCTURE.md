# 🏗️ Infraestructura de Coreboard

## Estado Actual ✅

### Base de Datos (Supabase PostgreSQL)

Se han aplicado **9 migraciones** exitosamente:

```
01_create_app_schema              → Enums, funciones base, esquema app
02_create_multi_tenant_core       → Orgs, memberships, salons, employees, clients, services
03_appointments_payments_expenses → Turnos, items, pagos, gastos
04_commission_system              → Reglas y cálculo de comisiones
05_rls_security_policies          → Row Level Security en todas las tablas
06_analytics_views                → Vistas para reportes (v_weekly_summary, v_employee_performance, etc)
07_rpc_functions                  → Funciones callable (weekly_summary, weekly_commissions, clients_export)
08_audit_notifications            → Auditoría y notificaciones
09_integrity_checks               → Validación de integridad de datos
```

### Tablas Creadas (13 principales)

#### Core Multi-Tenant
- `app.orgs` - Organizaciones
- `app.memberships` - Relación usuario-organización
- `app.salons` - Sucursales
- `app.employees` - Personal
- `app.clients` - Base de clientes
- `app.services` - Catálogo de servicios

#### Turnos & Finanzas
- `app.appointments` - Citas/turnos
- `app.appointment_items` - Servicios por turno
- `app.payments` - Ingresos
- `app.expenses` - Gastos

#### Comisiones
- `app.commission_rules` - Reglas de cálculo
- `app.commissions` - Comisiones generadas

#### Auditoría
- `app.activity_log` - Log de cambios
- `app.notifications` - Notificaciones

### Funciones de Seguridad

```sql
app.tg__set_timestamps()          -- Auto-actualiza created_at/updated_at
app.current_user_id()             -- Obtiene ID del usuario actual
app.user_is_member_of(org_id)    -- Verifica membresía (usada en RLS)
app.ensure_pct_range(p)          -- Valida porcentajes [0..100]
app.price_for_service()          -- Busca precio por sucursal
app.best_rule_for_item()         -- Selecciona comisión óptima
```

### Triggers Automáticos

```
_ts on app.orgs, app.memberships, app.salons, app.employees, etc.
    → Mantiene timestamps actualizados

_defaults on app.appointment_items
    → Calcula unit_price, subtotal y valida commission_pct

_recalc_total_ai on app.appointment_items
    → Recalcula total de turno cuando cambian items

_complete_commissions on app.appointments
    → Genera comisiones cuando status = 'completed'

_log on app.appointments
    → Auditoría de cambios

_chk on app.appointments
    → Valida que org_id coincida

_chk_ssp on app.salon_service_prices
    → Valida que salon y service pertenezcan a la misma org
```

### Vistas de Análisis

```
v_financials_by_day      → Ingresos por día/sucursal
v_expenses_by_day        → Gastos por día/sucursal
v_daily_balance          → Balance diario (ingresos - gastos)
v_employee_performance   → KPIs de empleados
v_weekly_commissions     → Comisiones semanales
v_weekly_summary         → Resumen integral semanal (PRINCIPAL)
v_clients_metrics        → Métricas de clientes
v_notifications_pending  → Notificaciones pendientes de leer
v_cashflow               → Flujo de caja consolidado
v_cashflow_summary       → Resumen de flujo de caja
```

### Funciones RPC (Callable desde Frontend)

```typescript
app.weekly_summary(org_id, salon_id?, from?, to?)
  → Resumen semanal: turnos, ingresos, gastos, comisiones, ganancia neta

app.weekly_commissions(org_id, employee_id?, from?, to?)
  → Comisiones semanales por empleado

app.clients_export(org_id)
  → Export de clientes con métricas
```

### Row Level Security (RLS)

✅ **Habilitado en todas las tablas del esquema `app`**

Política de seguridad:
```
- Cada usuario solo ve datos de sus organizaciones
- Se valida con: app.user_is_member_of(org_id)
- Permisos por rol: admin, owner, employee, viewer
- Enforcement automático a nivel de base de datos
```

---

## Autenticación & Tokens 🔐

### AuthContext (`src/contexts/AuthContext.tsx`)

**Estado:**
- `user` - Datos del usuario autenticado
- `session` - Token JWT de Supabase
- `loading` - Estado de carga
- `memberships` - Organizaciones a las que pertenece

**Métodos:**
- `signIn(email, password)` - Autenticación con email/contraseña
- `signInAsDemo()` - Modo demostración (sin Supabase)
- `signOut()` - Cierre de sesión
- `switchOrganization(org_id)` - Cambiar entre organizaciones

**Token Persistence:**
```javascript
// Se guarda automáticamente en localStorage
localStorage.getItem('sb-session')

// Se restaura al montar la app
supabase.auth.setSession(parsed)

// RLS filtra datos automáticamente según currentOrgId
```

---

## Hooks de Datos 🪝

### `useAuth()`
```typescript
const {
  user,              // Datos del usuario
  session,           // Token Supabase
  loading,           // boolean
  currentOrgId,      // UUID de org actual
  currentRole,       // 'admin'|'owner'|'employee'|'viewer'
  signIn,
  signOut,
  switchOrganization
} = useAuth();
```

### `useOrganizations()`
```typescript
const { orgs, loading, error } = useOrganizations();
// orgs: Organization[] con id, name, tax_id, created_at
```

### `useClients(orgId?)`
```typescript
const {
  clients,           // Client[]
  loading,
  error,
  fetchClients,      // Función para recargar
  createClient,      // Agregar cliente
  updateClient,      // Editar cliente
  deleteClient       // Soft delete (updated deleted_at)
} = useClients();
```

---

## Flujos de Datos 📊

### 1. Login User

```
┌─ User entra credenciales
├─ supabase.auth.signInWithPassword()
├─ Token generado en session
├─ Se guarda en localStorage
├─ fetchUserMemberships(userId)
├─ Se cargan organizaciones desde app.memberships
└─ Selecciona primera org como currentOrgId
```

### 2. Ver Datos (con RLS)

```
┌─ Hook llama: useClients()
├─ Obtiene currentOrgId del AuthContext
├─ Ejecuta: .eq('org_id', currentOrgId)
├─ RLS verifica: app.user_is_member_of(currentOrgId)
├─ Si pasa → Trae datos de esa org
└─ Si falla → Retorna error de RLS
```

### 3. Crear Turno

```
┌─ handleBook({ salonId, clientId, services })
├─ supabase.from('app.appointments').insert({
│   org_id: currentOrgId,    ← RLS valida
│   salon_id, client_id, ...
│ })
├─ Trigger tg__items_defaults() calcula precios
├─ Insert en app.appointment_items
├─ Trigger _recalc_total_ai() actualiza total
└─ Hook detecta cambios y re-render
```

### 4. Completar Turno → Generar Comisiones

```
┌─ updateAppointment({ status: 'completed' })
├─ Trigger tg__on_appointment_completed() dispara
├─ Para cada item en el turno:
│  ├─ app.best_rule_for_item() busca comisión óptima
│  ├─ Crea fila en app.commissions
│  └─ commission_pct y amount se calculan automáticamente
└─ Hook getCommissions() refleja cambios
```

---

## Seguridad por Capas 🛡️

### 1. Nivel Base de Datos
- **RLS en todas las tablas** → Imposible acceder datos de otra org
- **Triggers de validación** → org_id debe coincidir con salon_id
- **Enums tipados** → Solo valores válidos (roles, estados)
- **Check constraints** → Porcentajes [0..100], precios >= 0

### 2. Nivel API (Supabase)
- **Tokens JWT** → Expiración y rotación automática
- **Session management** → Supabase maneja renuevo
- **Funciones seguras** → RPC usa `security definer`

### 3. Nivel Frontend
- **Token en localStorage** → Recuperable al recargar
- **AuthContext provider** → Centraliza sesión
- **Hooks validados** → Solo acceden a currentOrgId

---

## Escalabilidad 📈

### Multi-Tenant Ready
- Cada organización está aislada por `org_id`
- Queries automáticamente filtradas por RLS
- Datos de múltiples orgs no se mezclan

### Performance
- Índices en:
  - `app.salons(org_id)`
  - `app.appointments(salon_id, starts_at)`, `(status, starts_at)`
  - `app.clients(org_id)`, `(full_name)`
  - `app.employees(user_id)`
  - `app.commissions(employee_id, calculated_at)`

### Auditoría Integrada
- Cada cambio en `app.appointments` se registra
- `app.activity_log` tiene datos OLD y NEW
- Timestamps automáticos en todo

---

## Próximos Pasos 🚀

### Adicionales Recomendados (Opcional)

1. **Migrar demo data a BD real**
   - Ejecutar `infra/db/seed.sql`
   - Crear membresía real para usuario autenticado

2. **Implementar componentes de UI**
   - `ClientsView` → useClients() + table
   - `AppointmentBook` → RPC + triggers
   - `FinancesCharts` → Usar v_weekly_summary

3. **Storage de archivos**
   - Fotos de clientes en `storage.clients-photos`
   - Recibos en `storage.receipts`
   - RLS para storage también

4. **Edge Functions** (Opcional)
   - Notificaciones por email pre-turno
   - Sync a CRM externo
   - Webhooks a sistemas de pago

---

## Checklist de Validación ✓

- [x] Esquema multi-tenant implementado
- [x] RLS habilitado en todas las tablas
- [x] Triggers automáticos funcionando
- [x] Vistas de análisis creadas
- [x] Functions RPC disponibles
- [x] AuthContext maneja tokens
- [x] useClients() con RLS integrado
- [x] Demo mode para pruebas
- [x] Documentación completa (README.md + SETUP.md)
- [x] Seed data preparado

**Estado:** 🟢 LISTO PARA PRODUCCIÓN
