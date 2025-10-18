# ⚡ Quick Start - Coreboard

## 📋 Resumen de lo que se configuró

### ✅ Base de Datos Supabase
- **9 migraciones aplicadas** con esquema multi-tenant completo
- **13 tablas** en el esquema `app` (organizaciones, turnos, pagos, comisiones, etc)
- **RLS habilitado** en todo - cada usuario solo ve sus datos
- **Triggers automáticos** para cálculos (totales, comisiones, timestamps)
- **Funciones RPC** para reportes (weekly_summary, commissions, export)

### ✅ Autenticación & Tokens
- **AuthContext** (`src/contexts/AuthContext.tsx`) - Maneja la sesión
- **Token persistence** - localStorage guarda/restaura automáticamente
- **Multi-org support** - Usuario puede tener varias organizaciones
- **Demo mode** - Pruebas sin autenticación real

### ✅ Hooks de Datos
- **useAuth()** - Usuario, token, org actual, rol
- **useOrganizations()** - Lista de organizaciones del usuario
- **useClients()** - Clientes con RLS integrada automáticamente

---

## 🚀 5 Pasos para Empezar

### 1️⃣ Variables de Ambiente
Crea `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2️⃣ Instala dependencias
```bash
npm install
```

### 3️⃣ Inicia dev
```bash
npm run dev
```

### 4️⃣ Prueba demo mode
```typescript
import { useAuth } from '@/contexts/AuthContext';

function App() {
  const { signInAsDemo, user } = useAuth();
  
  return (
    <button onClick={signInAsDemo}>
      Demo Login
    </button>
  );
}
```

### 5️⃣ Carga datos reales (Opcional)
Ejecuta en Supabase SQL Editor:
```sql
-- Crear org de prueba
INSERT INTO app.orgs (name) VALUES ('Mi Salón') RETURNING id;

-- Crear membresía (reemplaza IDs)
INSERT INTO app.memberships (org_id, user_id, role)
VALUES ('org-uuid', 'auth-user-uuid', 'owner');

-- Crear clientes
INSERT INTO app.clients (org_id, full_name, phone)
VALUES ('org-uuid', 'Juan Pérez', '+54 11 1234-5678');
```

---

## 🔄 Flujos Principales

### Flujo 1: Ver Clientes
```typescript
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';

function ClientList() {
  const { user, currentOrgId } = useAuth();
  const { clients, loading } = useClients();
  // ✅ RLS automática: solo trae clientes de currentOrgId
  
  return (
    <div>
      {loading ? 'Cargando...' : (
        <ul>
          {clients.map(c => <li key={c.id}>{c.full_name}</li>)}
        </ul>
      )}
    </div>
  );
}
```

### Flujo 2: Crear Turno
```typescript
async function bookAppointment() {
  const { currentOrgId } = useAuth();
  
  // 1. Crear turno
  const { data: apt } = await supabase
    .from('app.appointments')
    .insert([{
      org_id: currentOrgId,
      salon_id: 'salon-123',
      client_id: 'client-456',
      employee_id: 'emp-789',
      status: 'confirmed',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 3600000).toISOString(),
    }])
    .select();

  // 2. Agregar servicios
  await supabase
    .from('app.appointment_items')
    .insert([{
      appointment_id: apt[0].id,
      service_id: 'service-111',
      quantity: 1,
      // ⚡ Trigger calcula unit_price automáticamente
    }]);
  
  // ✅ Turno creado, total calculado automáticamente
}
```

### Flujo 3: Completar Turno → Generar Comisiones
```typescript
async function completeAppointment(appointmentId) {
  // Marcar como completado
  await supabase
    .from('app.appointments')
    .update({ status: 'completed' })
    .eq('id', appointmentId);
  
  // ⚡ Trigger automático genera comisiones
  // Las comisiones aparecen en app.commissions

  // Ver comisiones generadas
  const { data: commissions } = await supabase
    .from('app.commissions')
    .select('*')
    .eq('appointment_item_id', appointmentId);
  
  console.log('Comisiones:', commissions);
}
```

### Flujo 4: Reportes Semanales
```typescript
async function getWeeklyReport() {
  const { currentOrgId } = useAuth();
  
  const { data } = await supabase.rpc('app.weekly_summary', {
    p_org: currentOrgId,
    p_from: new Date('2025-01-01'),
    p_to: new Date('2025-01-07')
  });
  
  console.log(data[0]);
  // {
  //   revenue: 15000,
  //   expenses: 3000,
  //   commissions: 2250,
  //   net_profit: 9750,
  //   completed: 12,
  //   cancelled: 1
  // }
}
```

---

## 🔐 Seguridad: RLS en Acción

### ✅ PERMITIDO (Tu organización)
```typescript
const { data } = await supabase
  .from('app.clients')
  .select('*')
  .eq('org_id', currentOrgId);
// ✅ RLS verifica: user_is_member_of(currentOrgId) → OK
```

### ❌ BLOQUEADO (Otra organización)
```typescript
const { data, error } = await supabase
  .from('app.clients')
  .select('*')
  .eq('org_id', 'other-org-id');
// ❌ RLS verifica: user_is_member_of('other-org-id') → DENIED
// error: "new row violates row-level security policy"
```

---

## 📊 Arquitectura en 1 Diagrama

```
┌─────────────────────────────────────────────┐
│           FRONTEND (React/Next.js)          │
├─────────────────────────────────────────────┤
│  useAuth()         useClients()             │
│  (token, org_id)   (datos con RLS)          │
├─────────────────────────────────────────────┤
│         localStorage (sb-session)           │
└──────────────────┬──────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────┐
│    SUPABASE (PostgreSQL + Auth)             │
├─────────────────────────────────────────────┤
│ ✅ RLS Filter: org_id in user_memberships  │
│ ✅ Triggers: totales, comisiones, logs      │
│ ✅ Functions: weekly_summary(), RPCs        │
└────────────────┬────────────────────────────┘
                 │
      ┌──────────┴──────────┐
      ↓                     ↓
  ┌────────────┐      ┌────────────┐
  │ app.clients│      │app.orgs    │
  │ (RLS)      │      │ (RLS)      │
  └────────────┘      └────────────┘
      ↓
  ┌────────────────────────┐
  │ app.memberships        │
  │ (RLS: solo tu org)     │
  └────────────────────────┘
```

---

## 🆘 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| "relation 'app.clients' does not exist" | Migraciones no aplicadas. Ver Supabase → SQL Editor |
| "new row violates row-level security policy" | No tienes membresía en esa org. Chequea app.memberships |
| useClients() retorna vacío | Verifica que currentOrgId exista. Prueba con demo mode |
| Token no persiste | Revisa localStorage y NEXT_PUBLIC_SUPABASE_URL |
| RLS no funciona | Verifica que RLS esté habilitado: `SELECT rowsecurity FROM pg_tables WHERE schemaname='app'` |

---

## 📚 Documentación Completa

- **README.md** → Arquitectura y flujos de datos
- **SETUP.md** → Paso a paso de configuración + ejemplos SQL
- **INFRASTRUCTURE.md** → Estado completo de la BD y migraciones
- **src/contexts/AuthContext.tsx** → Token management
- **src/hooks/useClients.ts** → Hooks de datos

---

## 🎯 Ahora Puedes...

- ✅ Crear usuarios y orgs en Supabase
- ✅ Loguear con email/contraseña o demo mode
- ✅ Ver solo tus datos (RLS automática)
- ✅ Crear turnos → Comisiones generadas automáticamente
- ✅ Acceder a reportes semanales
- ✅ Cambiar entre organizaciones
- ✅ Gestionar clientes, empleados, servicios

---

## 🚀 Próximas Acciones

1. **Verificar BD**: Ejecuta `SELECT * FROM app.orgs LIMIT 1;` en Supabase
2. **Crear datos**: Usa los scripts en SETUP.md
3. **Conectar UI**: Adapta los componentes existentes a los hooks
4. **Deploy**: Las migraciones ya están listas para producción

**¡Listo para empezar! 🎉**
