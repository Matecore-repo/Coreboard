# 🚀 Configuración de Coreboard

## Paso 1: Variables de Ambiente

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Reemplaza:
- `your-project` con tu ID de proyecto Supabase
- `your-anon-key` con tu clave anónima (disponible en Supabase → Settings → API)

## Paso 2: Verificar Base de Datos

### Confirmar que todas las tablas están creadas:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'app'
ORDER BY table_name;
```

Deberías ver ~13 tablas en el esquema `app`.

### Verificar RLS está habilitado:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'app';
```

Todos deberían mostrar `t` (true).

## Paso 3: Crear Datos de Prueba

### 3.1 Crear una Organización

```sql
INSERT INTO app.orgs (name, tax_id)
VALUES ('Mi Primer Salón', '20-12345678-9')
RETURNING id;
```

Copia el `id` retornado (será tu `org_id`).

### 3.2 Crear una Membresía (Conectar Usuario)

```sql
INSERT INTO app.memberships (org_id, user_id, role, is_primary)
VALUES (
  'your-org-id-here',  -- Reemplaza con el id del paso anterior
  'your-user-id-here', -- Tu ID de usuario de Supabase
  'owner',
  true
);
```

Para obtener tu `user_id`, ejecuta en el cliente:
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log(user?.id);
```

### 3.3 Crear una Sucursal

```sql
INSERT INTO app.salons (org_id, name, address, phone, timezone)
VALUES (
  'your-org-id-here',
  'Centro',
  'Calle Principal 123',
  '+54 11 1234-5678',
  'America/Argentina/Buenos_Aires'
)
RETURNING id;
```

### 3.4 Crear Servicios

```sql
INSERT INTO app.services (org_id, name, duration_minutes, base_price)
VALUES 
  ('your-org-id-here', 'Corte Clásico', 30, 500.00),
  ('your-org-id-here', 'Corte + Barba', 45, 800.00),
  ('your-org-id-here', 'Tratamiento Capilar', 60, 1200.00)
RETURNING id;
```

### 3.5 Crear Empleados

```sql
INSERT INTO app.employees (org_id, full_name, email, default_commission_pct)
VALUES (
  'your-org-id-here',
  'Juan Pérez',
  'juan@saloon.local',
  15.00
)
RETURNING id;
```

### 3.6 Crear Clientes

```sql
INSERT INTO app.clients (org_id, full_name, phone, email, notes)
VALUES 
  ('your-org-id-here', 'Carlos López', '+54 11 9111-2222', 'carlos@example.com', 'Cliente frecuente'),
  ('your-org-id-here', 'María García', '+54 11 9333-4444', 'maria@example.com', null)
RETURNING id;
```

## Paso 4: Probar la Autenticación

### En tu app:

```typescript
import { useAuth } from '@/contexts/AuthContext';

function TestAuth() {
  const { signInAsDemo } = useAuth();
  
  return (
    <button onClick={() => signInAsDemo()}>
      Demo Login
    </button>
  );
}
```

Con esto podrás ver:
- `useAuth().user` → Datos del usuario
- `useAuth().currentOrgId` → Tu org_id
- `useAuth().currentRole` → Tu rol (owner)

## Paso 5: Probar Hooks

### Listar Clientes:

```typescript
import { useClients } from '@/hooks/useClients';

function ClientsList() {
  const { clients, loading } = useClients();
  
  if (loading) return <p>Cargando...</p>;
  
  return (
    <ul>
      {clients.map(c => (
        <li key={c.id}>{c.full_name}</li>
      ))}
    </ul>
  );
}
```

### Listar Organizaciones:

```typescript
import { useOrganizations } from '@/hooks/useClients';

function OrgsList() {
  const { orgs, loading } = useOrganizations();
  
  return (
    <ul>
      {orgs.map(org => (
        <li key={org.id}>{org.name}</li>
      ))}
    </ul>
  );
}
```

## Paso 6: Funciones RPC

### Resumen Semanal:

```typescript
const { data: summary } = await supabase.rpc('app.weekly_summary', {
  p_org: 'your-org-id',
  p_from: new Date('2025-01-01'),
  p_to: new Date('2025-01-07')
});

console.log(summary);
// {
//   org_id, salon_id, week_start,
//   total_appointments, completed, cancelled, no_show,
//   revenue, expenses, gross_margin, commissions, net_profit
// }
```

### Comisiones por Empleado:

```typescript
const { data: commissions } = await supabase.rpc('app.weekly_commissions', {
  p_org: 'your-org-id',
  p_employee: 'employee-id'
});
```

### Export de Clientes:

```typescript
const { data: clients } = await supabase.rpc('app.clients_export', {
  p_org: 'your-org-id'
});
```

## 🔒 Seguridad: RLS en Acción

Cuando llames a cualquier tabla con RLS habilitado:

```typescript
// ✅ FUNCIONA: Traes datos de TU organización
const { data } = await supabase
  .from('app.clients')
  .select('*')
  .eq('org_id', currentOrgId);

// ❌ FALLA: RLS bloquea acceso a otra org
const { data, error } = await supabase
  .from('app.clients')
  .select('*')
  .eq('org_id', 'another-org-id');

// error: "new row violates row-level security policy"
```

## 📊 Flujo Completo: Crear y Completar Turno

```typescript
import supabase from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

async function completeBooking() {
  const { currentOrgId } = useAuth();

  // 1️⃣ Crear turno
  const { data: [appointment], error: err1 } = await supabase
    .from('app.appointments')
    .insert([{
      org_id: currentOrgId,
      salon_id: 'salon-id',
      client_id: 'client-id',
      employee_id: 'employee-id',
      status: 'confirmed',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 60*60*1000).toISOString(),
    }])
    .select();

  if (err1) throw err1;

  // 2️⃣ Agregar servicios (el trigger calcula subtotal)
  const { error: err2 } = await supabase
    .from('app.appointment_items')
    .insert([
      {
        appointment_id: appointment.id,
        service_id: 'service-1',
        quantity: 1,
        // unit_price se calcula automáticamente
      },
      {
        appointment_id: appointment.id,
        service_id: 'service-2',
        quantity: 1,
      }
    ]);

  if (err2) throw err2;

  // 3️⃣ Marcar como completado
  // ⚡ Trigger automático genera comisiones
  const { error: err3 } = await supabase
    .from('app.appointments')
    .update({ status: 'completed' })
    .eq('id', appointment.id);

  if (err3) throw err3;

  // 4️⃣ Verificar comisiones generadas
  const { data: commissions } = await supabase
    .from('app.commissions')
    .select('*')
    .eq('org_id', currentOrgId);

  console.log('Comisiones:', commissions);
}
```

## 🆘 Troubleshooting

### "relation 'app.clients' does not exist"
- Verifica que la migración se ejecutó correctamente
- Ejecuta: `SELECT * FROM app.clients LIMIT 1;`

### "new row violates row-level security policy"
- Asegúrate de que tienes membresía en esa org
- Verifica: `SELECT * FROM app.memberships WHERE user_id = 'your-id';`

### El token no se persiste
- Revisa localStorage: `localStorage.getItem('sb-session')`
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` sea correcto

### useClients() retorna vacío
- Verifica que tengas `currentOrgId` en AuthContext
- Confirma que hay clientes en esa org: `SELECT * FROM app.clients WHERE org_id = 'your-org-id';`

## 📚 Documentación Completa

Ver `README.md` para:
- Arquitectura de la base de datos
- Flujos de datos
- Roles y permisos
- Ejemplos de uso
