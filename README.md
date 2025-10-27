# Coreboard - Sistema de Gestión de Salones

Plataforma multi-tenant robusta para la gestión integral de salones de belleza, barbería y servicios afines.

## 🏗️ Arquitectura

### Base de Datos (Supabase PostgreSQL)

La infraestructura está organizada en el esquema `app` con las siguientes entidades principales:

#### 1. **Multi-Tenant Core**
- `app.orgs` - Organizaciones (dueños/empresas)
- `app.memberships` - Relación usuario-organización con roles
- `app.salons` - Sucursales por organización
- `app.employees` - Empleados/barberos/estilistas
- `app.clients` - Clientes por organización
- `app.services` - Servicios/prestaciones
- `app.salon_service_prices` - Precios especiales por sucursal

#### 2. **Turnos & Pagos**
- `app.appointments` - Turnos/citas
- `app.appointment_items` - Ítems de servicios dentro de un turno
- `app.payments` - Pagos recibidos
- `app.expenses` - Gastos operacionales

#### 3. **Comisiones**
- `app.commission_rules` - Reglas de cálculo de comisiones
- `app.commissions` - Comisiones calculadas (generadas automáticamente)

#### 4. **Auditoría & Notificaciones**
- `app.activity_log` - Log de auditoría
- `app.notifications` - Notificaciones del sistema

### Roles & Seguridad (RLS)

Todos los datos están protegidos con Row Level Security (RLS):
- Cada usuario solo ve datos de sus organizaciones
- Memberships define rol: `admin`, `owner`, `employee`, `viewer`
- Función `app.user_is_member_of(org_id)` valida acceso

## ⚙️ Variables de Entorno

Crear archivo `.env.local` en la raíz:

```bash
# Supabase Configuration (requeridas)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Demo Mode (opcional, default: false)
# Deshabilita requests reales a BD, usa datos locales para desarrollo
NEXT_PUBLIC_DEMO_MODE=false

# Development
NODE_ENV=development
```

## 🔐 Gestión de Tokens

### AuthContext - `src/contexts/AuthContext.tsx`

Maneja:
- **Sesiones Supabase**: Token almacenado en `localStorage` con clave `sb-session`
- **Membresías**: Carga automática de organizaciones y roles del usuario
- **Multi-organizaciones**: Soporte para cambiar entre orgs con `switchOrganization()`
- **Demo mode**: Usuario demo para pruebas sin autenticación

```typescript
const { user, session, loading, currentOrgId, currentRole } = useAuth();

// currentOrgId: ID de la organización actual
// currentRole: Rol del usuario en esa organización
// session: Token JWT del Supabase
```

### Token Persistence

```typescript
// Automático: se guarda al loguearse
localStorage.setItem('sb-session', JSON.stringify(session));

// Automático: se restaura al montar la app
const sessionJson = localStorage.getItem('sb-session');
if (sessionJson) await supabase.auth.setSession(parsed);
```

## 🪝 Hooks Principales

### `useAuth()`
```typescript
const { user, currentOrgId, currentRole, signIn, signOut } = useAuth();
```

### `useOrganizations()`
```typescript
const { orgs, loading } = useOrganizations();
// Obtiene todas las organizaciones del usuario
```

### `useClients(orgId?)`
```typescript
const { clients, createClient, updateClient, deleteClient } = useClients();
// orgId opcional: si no se pasa, usa currentOrgId del AuthContext
```

## 📝 Flujo de Datos

### 1. **Login**
```
User signIn → Supabase Auth → Token generado → 
Se guardan membresías en localStorage → 
App renderiza datos según currentOrgId
```

### 2. **Crear Turno**
```
createAppointment({ 
  org_id: currentOrgId, 
  salon_id, 
  client_id, 
  employee_id,
  items: [{ service_id, quantity }]
})
→ Trigger calcula total_amount automáticamente
→ RLS verifica app.user_is_member_of(org_id)
```

### 3. **Completar Turno**
```
updateAppointment(id, { status: 'completed' })
→ Trigger genera comisiones en app.commissions
→ Se aplican commission_rules según priority:
   1. employee_service
   2. service
   3. employee
   4. global
```

## 🎯 Casos de Uso

### Listado de Clientes (con RLS)
```typescript
const { clients } = useClients();
// Solo trae clientes de currentOrgId automáticamente
```

### Reportes Semanales
```typescript
const { data } = await supabase.rpc('app.weekly_summary', {
  p_org: currentOrgId,
  p_salon: salonId,
  p_from: new Date(),
  p_to: new Date()
});
```

### Comisiones por Empleado
```typescript
const { data } = await supabase.rpc('app.weekly_commissions', {
  p_org: currentOrgId,
  p_employee: employeeId
});
```

## 🔧 Configuración (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🚀 Deploy a Producción

1. Todas las migraciones están aplicadas en Supabase
2. RLS está habilitado en todas las tablas
3. Funciones de seguridad están en lugar (user_is_member_of, ensure_pct_range)
4. Triggers automáticos para cálculos (totales, comisiones, timestamps)

## 📋 Tabla Rápida: Qué puede ver cada rol

| Recurso | Admin | Owner | Employee | Viewer |
|---------|-------|-------|----------|---------|
| Membresías | ✅ | ✅ | ❌ | ❌ |
| Sucursales | ✅ | ✅ | ✅ | ✅ |
| Empleados | ✅ | ✅ | ❌ | ❌ |
| Turnos | ✅ | ✅ | ✅ | ✅ |
| Clientes | ✅ | ✅ | ✅ | ✅ |
| Pagos | ✅ | ✅ | ✅ | ❌ |
| Gastos | ✅ | ✅ | ❌ | ❌ |
| Comisiones | ✅ | ✅ | ✅ | ❌ |

*Nota: RLS se aplica automáticamente basado en org_id y roles*

## 🎓 Ejemplo Completo: Crear y Completar un Turno

```typescript
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/lib/supabase';

function BookingFlow() {
  const { currentOrgId } = useAuth();

  const handleBook = async (salonId, clientId, employeeId, services) => {
    // 1. Crear turno
    const { data: appointment, error: err1 } = await supabase
      .from('app.appointments')
      .insert([{
        org_id: currentOrgId,
        salon_id: salonId,
        client_id: clientId,
        employee_id: employeeId,
        status: 'confirmed',
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 60*60*1000).toISOString(),
      }])
      .select();

    if (err1) throw err1;
    const appointmentId = appointment[0].id;

    // 2. Agregar servicios
    const items = services.map(s => ({
      appointment_id: appointmentId,
      service_id: s.id,
      quantity: 1,
      // unit_price se llena automáticamente por trigger
    }));

    const { error: err2 } = await supabase
      .from('app.appointment_items')
      .insert(items);

    if (err2) throw err2;

    // 3. Completar turno
    const { error: err3 } = await supabase
      .from('app.appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId);

    if (err3) throw err3;
    // ✅ Comisiones calculadas automáticamente!
  };

  return <button onClick={handleBook}>Agendar</button>;
}
```
  