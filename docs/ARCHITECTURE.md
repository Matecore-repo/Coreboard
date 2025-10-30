# ARCHITECTURE.md - Análisis Completo de Coreboard

## 🎯 Resumen Ejecutivo

Coreboard es un CRM de turnos para salones/peluquerías construido con Next.js + Supabase + React. Soporta:
- Multi-organización con RLS (Row Level Security)
- Autenticación con Supabase Auth
- Modo demo sin backend para pruebas
- Interfaz moderna con componentes reutilizables
- Gestión completa de turnos, clientes, empleados, servicios

---

## 📁 Estructura General de `src/`

```
src/
├── App.tsx                 # Shell principal - routing y estado global
├── contexts/
│   └── AuthContext.tsx     # Gestión de sesión, usuario, organización
├── hooks/
│   ├── useAppointments.ts  # CRUD de turnos
│   ├── useSalons.ts        # Gestión de salones
│   ├── useClients.ts       # Gestión de clientes
│   ├── useEmployees.ts     # Gestión de empleados
│   ├── useSalonServices.ts # Servicios por salón
│   ├── useServices.ts      # Servicios globales
│   └── useCommissions.ts   # Cálculo de comisiones
├── lib/
│   ├── supabase.ts         # Cliente Supabase (con modo demo)
│   ├── theme.ts            # Temas y estilos
│   ├── demoData.ts         # Datos de ejemplo
│   └── uuid.ts             # Validación de UUIDs
├── components/
│   ├── views/              # Vistas principales (8 files)
│   ├── sections/           # Secciones complementarias
│   ├── features/           # Features complejos
│   ├── ui/                 # Componentes UI sin estado
│   └── empty-states/       # Estados vacíos
├── demo/
│   ├── constants.ts        # Banderas de demo
│   └── store.ts            # Mock data para modo demo
├── types/
│   └── index.ts            # Tipos compartidos
└── styles/
    ├── globals.css         # Estilos globales
    └── index.css           # CSS principal
```

---

## 🔐 Autenticación - AuthContext.tsx

### Funcionalidad Principal
- **Gestión de sesión**: Login, signup, logout, reset password
- **Almacenamiento seguro**: localStorage con try-catch para SSR safety
- **Modo demo**: Simula usuarios sin hacer requests reales
- **Membresías**: Roles por organización (owner, admin, employee, viewer)

### Flujo Clave
```
User Login → Supabase Auth → Obtener membresías → Seleccionar org
   ↓
AuthContext actualiza: user, session, currentOrgId, currentRole
   ↓
App.tsx re-renderiza con acceso a datos autenticados
```

### Métodos Principales
- `signIn(email, password)` → Login con Supabase Auth
- `signUp(email, password, token)` → Registro con token de invitación
- `switchOrganization(org_id)` → Cambiar organización actual
- `claimInvitation(token)` → Aceptar invitación a organización

### LocalStorage Keys
- `sb-session` → Sesión de Supabase
- `sb-current-org` → Organización seleccionada
- `sb-selected-salon` → Salón seleccionado

---

## 📡 Cliente Supabase - lib/supabase.ts

### Patrón Lazy Initialization
- Cliente se crea solo en browser (no en SSR/build)
- Proxy pattern para acceso lazy
- Stubs durante SSR para evitar errores

### Modo Demo
```javascript
if (isDemoMode) {
  // Retorna stub que simula API sin requests reales
  // Usado para desarrollo/testing sin backend
}
```

### Admin Client
- `createAdminSupabaseClient()` → Cliente con service role key
- Para scripts (invitaciones, reset password, etc)

---

## 🎣 Hooks - Acceso a Datos

### useAppointments(salonId?, options?)
**Responsabilidad**: CRUD de turnos

```javascript
// Obtiene turnos filtrados por salón/organización
const { appointments, loading, createAppointment, updateAppointment, deleteAppointment } = useAppointments(salonId);

// Mapea formato DB → UI:
// DB: { starts_at: "2025-10-30T14:30:00" }
// UI: { date: "2025-10-30", time: "14:30" }
```

**Features**:
- Suscripción realtime a cambios
- Validación de UUIDs
- Fallback a demo store

### useSalons(orgId?, options?)
**Responsabilidad**: Gestión de salones

```javascript
// Obtiene salones de la organización
const { salons, loading, createSalon, updateSalon } = useSalons(currentOrgId);

// Mapea servicios asociados a cada salón
```

### useClients(salonId?, options?)
**Responsabilidad**: Gestión de clientes

```javascript
// Obtiene clientes del salón/org
// Usado en ClientsView para listar y administrar clientes
```

### useEmployees(salonId?, options?)
**Responsabilidad**: Gestión de empleados

```javascript
// Obtiene empleados del salón
// Integra con cálculo de comisiones
```

### useSalonServices(salonId?)
**Responsabilidad**: Servicios específicos de un salón

```javascript
// Obtiene servicios del salón con precios/duraciones
```

### Patrón Común
```javascript
- State: [data, loading, error]
- useEffect: fetch al montar o cuando dependencias cambian
- useCallback: funciones CRUD memoizadas
- Suscripción realtime a cambios en BD
- Fallback a demoStore si isDemo
```

---

## 🎨 Componentes - Arquitectura

### views/ (Vistas Principales - 8 componentes)
```
HomeView.tsx              # Dashboard principal (calendario + resumen)
FinancesView.tsx          # Reportes de finanzas
OrganizationView.tsx      # Configuración de organización
SalonsManagementView.tsx  # Gestión de salones
ProfileView.tsx           # Perfil de usuario
SettingsView.tsx          # Configuración de la app
LoginView.tsx             # Página de login
ResetPasswordPage.tsx     # Reset de contraseña
```

### sections/ (Secciones Complementarias - 2 componentes)
```
ClientsView.tsx           # Gestión de clientes (tabla, filtros)
EmployeesView.tsx         # Gestión de empleados
```

### features/ (Componentes Complejos Reutilizables)

#### appointments/ - Gestión de turnos
```
AppointmentCard.tsx       # Card para mostrar turno
AppointmentDialog.tsx     # Modal crear/editar turno
AppointmentActionBar.tsx  # Acciones rápidas (completar, cancelar)
```

**Flujo**:
1. Calendar muestra AppointmentCard
2. Click en card → abre AppointmentDialog
3. Llena formulario → createAppointment hook
4. AppointmentActionBar para cambiar estado

#### finances/ - Reportes financieros
```
FinancesCharts.tsx        # Gráficos (BarChart, AreaChart, PieChart)
```

**Usos**:
- Ingresos por servicio (pie chart)
- Ingresos por día (area chart)
- Revenue trend (bar chart)

### ui/ (49 componentes base sin estado)
```
button.tsx, card.tsx, badge.tsx, dialog.tsx, form.tsx, input.tsx, etc.
```

### generic/ (Componentes reutilizables con estado)
```
CalendarView.tsx          # Calendario mes actual
FilterBar.tsx             # Filtros (por salón, estado, etc)
GenericActionBar.tsx      # Acciones genéricas
TurnosPanel.tsx           # Panel de turnos del día
ClientsPanel.tsx          # Panel de clientes recientes
ServicesPanel.tsx         # Panel de servicios
```

---

## 🌍 App.tsx - Orquestador Principal

### Responsabilidades
1. **Routing**: Lazy load vistas según tab seleccionado
2. **Estado global**: Turnos, salones, usuario actual
3. **Interacciones**: Crear turno, cambiar salón, etc
4. **UI layout**: Navbar, sidebar, main content

### Flujo Render
```
App.tsx
├── AuthProvider (context)
├── Navbar (usuario, salón, navegación)
├── Sidebar (tabs: home, clientes, finanzas, etc)
├── MainContent (lazy carga vista según tab)
│   ├── HomeView (default)
│   ├── ClientsView
│   ├── FinancesView
│   └── ...
├── AppointmentDialog (modal global para crear turno)
├── FloatingQuickActions (botones rápidos)
├── FilterBar (filtros globales)
├── ThemeBubble (toggle dark/light)
└── Sonner (notificaciones toast)
```

### Estado Principal
```javascript
currentTab = "home" | "clients" | "finances" | "settings" | ...
selectedSalon = string | null
appointments = Appointment[]
salons = Salon[]
currentUser = User
```

---

## 📊 Demo Store - demo/store.ts

### Propósito
Mock data para modo demo sin backend

### Estructura
```javascript
demoStore = {
  appointments: { list, create, update, delete },
  salons: { list, create, update },
  services: { list, create },
  clients: { list, create },
  employees: { list, create },
  organization: { get }
}
```

### Activación
```
NEXT_PUBLIC_DEMO_MODE=true npm run dev
```

---

## 🔄 Flujos Principales

### 1️⃣ Crear Turno
```
Click "Nuevo Turno"
  ↓
AppointmentDialog se abre
  ↓
Llenar: cliente, servicio, empleado, fecha, hora
  ↓
useAppointments().createAppointment()
  ↓
Supabase insert() en tabla appointments
  ↓
Realtime subscription notifica actualización
  ↓
CalendarView se re-renderiza
```

### 2️⃣ Login
```
LoginView: email + password
  ↓
AuthContext.signIn()
  ↓
supabase.auth.signInWithPassword()
  ↓
Obtener membresías del usuario
  ↓
Seleccionar organización default
  ↓
localStorage guardar sesión
  ↓
Router → /dashboard
```

### 3️⃣ Cambiar Salón
```
SalonCarousel click
  ↓
onSelectSalon()
  ↓
App.tsx: setSelectedSalon()
  ↓
useAppointments(selectedSalon) re-fetch
  ↓
useSalons() re-fetch
  ↓
UI actualiza con datos del salón
```

---

## 📱 UI Pattern - Componentes Reutilizables

### Estructura Típica
```tsx
// Componente funcional con props tipadas
interface Props {
  data: T[];
  loading: boolean;
  onSelect: (item: T) => void;
}

export function MyComponent({ data, loading, onSelect }: Props) {
  return (
    <div>
      {loading ? <Skeleton /> : data.map(...)}
    </div>
  );
}
```

### Lazy Loading en Vistas
```tsx
const HomeView = lazy(() => import("./components/views/HomeView"));

// En JSX:
<Suspense fallback={<LoadingState />}>
  <HomeView {...props} />
</Suspense>
```

---

## 🔒 RLS (Row Level Security)

### Principio
Los datos se filtran automáticamente por `org_id` en la BD

```sql
-- Ejemplo: SELECT * FROM appointments WHERE org_id = current_user.org_id
```

### En Hooks
```javascript
// useAppointments hace:
const { data } = await supabase
  .from('appointments')
  .select()
  .eq('salon_id', salonId)  // Filtro adicional UI-side
  // RLS en BD verifica org_id automáticamente
```

---

## 🛠️ Patrones Usados

### 1. Custom Hooks para Datos
- useAppointments, useSalons, useClients, etc.
- Encapsulan fetch + estado + suscripción realtime
- Reutilizables en múltiples componentes

### 2. Context para Auth Global
- AuthContext proporciona usuario, sesión, org actual
- Consumido por useAuth() hook

### 3. Lazy Loading + Suspense
- Vistas se cargan solo cuando se seleccionan
- Reduce bundle initial size

### 4. Componentes Memoizados
- AppointmentCard usa React.memo
- Evita re-renders innecesarios

### 5. Realtime Subscriptions
- useAppointments se suscribe a cambios
- Actualización instantánea en múltiples tabs

### 6. Demo Mode
- Misma interfaz funciona con o sin Supabase
- demoStore simula API

---

## 🚀 Flujo Inicio de Sesión

1. **Usuario entra a /** → protegido por AuthProvider
2. **No logueado?** → Redirect a LoginView
3. **Ingresa credenciales** → signIn(email, password)
4. **Supabase Auth** → Genera JWT, actualiza sesión
5. **Obtener membresías** → SELECT FROM memberships WHERE user_id = ?
6. **Seleccionar org** → currentOrgId = memberships[0].org_id
7. **localStorage** → Guardar sesión para persistencia
8. **Redirect** → /dashboard
9. **App cargado** → Mostrar HomeView

---

## 📚 Tipos Principales (src/types/index.ts)

```typescript
User {
  id: string
  email?: string
  memberships: Membership[]  // Roles por org
  current_org_id?: string
}

Membership {
  org_id: string
  role: 'owner' | 'admin' | 'employee' | 'viewer'
  is_primary?: boolean
}

Appointment {
  id: string
  clientName: string
  service: string
  date: string        // YYYY-MM-DD
  time: string        // HH:mm
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  stylist: string
  salonId: string
}

Salon {
  id: string
  org_id: string
  name: string
  address: string
  phone?: string
  services?: Service[]
}

Service {
  id: string
  name: string
  base_price: number
  duration_minutes: number
}
```

---

## 🎯 Decisiones de Diseño

### ✅ Por qué Supabase?
- PostgreSQL + Auth + Realtime
- RLS nativo para multi-tenant
- Pricing flexible

### ✅ Por qué Next.js?
- SSR para performance
- API routes para backend
- File-based routing

### ✅ Por qué Lazy Loading?
- Reduce bundle size
- Mejor UX inicial
- Preload inteligente

### ✅ Por qué Demo Mode?
- Develop sin configurar BD
- Demostración sin credenciales
- Testing en producción

---

## 🔗 Dependencias Críticas

- `@supabase/supabase-js` - Cliente API
- `next` - Framework
- `react` - UI
- `shadcn/ui` - Componentes base (49 files)
- `lucide-react` - Iconos
- `sonner` - Notificaciones toast

---

## 📝 Summary para Prompts Futuros

> "Coreboard es un CRM multi-org para salones. Auth vía Supabase, datos con RLS, modo demo sin BD. Arquitectura: App.tsx (shell) → AuthContext (sesión) → Hooks (CRUD) → Views (UI). Turnos: CalendarView → AppointmentCard → AppointmentDialog → createAppointment hook. Clientes, Empleados, Finanzas en otras vistas. RLS filtra automáticamente por org_id. Lazy load vistas. Realtime subs en cambios."

---

## ⚠️ TENSIONES LÓGICAS Y ASIMETRÍAS (CRÍTICO)

### El modelo mental propuesto

```
user
  └── org (currentOrgId - localStorage)
       └── salon (selectedSalon - localStorage)
            ├── appointments
            ├── clients
            ├── employees
            └── salonServices
```

**Es lógico. Pero NO es neutral.** Implica decisiones que tienen consecuencias.

---

### Tensión #1: Dos Fuentes de Verdad para "org actual"

**El problema:**
```
Frontend (localStorage):
  currentOrgId = "org-123"  ← Qué CREE que está viendo

Backend (RLS):
  auth.uid() + memberships → "org-456"  ← Qué PUEDE ver en realidad

Supabase gana. RLS filtra.
```

**La consecuencia:**
- Tu UI puede mostrar "mostrando org-123"
- Los hooks vuelven lista vacía
- **Esto es VÁLIDO según tu arquitectura**
- Pero es un estado raro que no está documentado

**Es lógico**: Aceptas incoherencia de estado. Está permitido.
**Lo honesto**: "El front NO puede asumir que localStorage es válido".

---

### Tensión #2: Condiciones de Carrera Suaves

**El flujo teórico:**
```
User cambia salón
  ↓
setSelectedSalon("salon-B")
  ↓
useAppointments("salon-B") fetch
  ↓
AuthContext actualiza org
```

**El flujo real (posible):**
```
setSelectedSalon("salon-B")
  ↓
useAppointments("salon-B") hace fetch con contexto viejo
  ↓
[200ms de espera]
  ↓
AuthContext actualiza org
  ↓
useAppointments vuelve a subscribirse
```

**La consecuencia:**
- Render con datos "stale" pero no inválidos
- No rompe, pero existe
- Cada hook se sincroniza solo → inconsistencia temporal

**Es lógico**: Es consecuencia de tener sincronización por recurso en lugar de por contexto.

---

### Tensión #3: Roles Binarios vs Features Granulares

**Tu modelo dice:**
```
Roles = owner | admin | employee | viewer
Aplicado por: "pertenezco a esta org"
```

**Pero luego agregás:**
```
Finanzas (¿puedo ver ingresos?)
Comisiones (¿puedo ver mis comisiones?)
Operaciones sensibles (¿puedo crear turnos?)
```

**La inconsistencia:**
- El modelo de roles es **binario por org**
- Las features necesitan **granularidad por tipo de dato**
- Tu RLS probablemente dice: `WHERE org_id = current_user_org_id`
- Pero tus permisos de negocio dicen: `IF role = 'employee' THEN no_finanzas`

**Es lógico**: El modelo es extensible pero incompleto.
**Lo honesto**: "Tenés un modelo de autorización de dos niveles que no están sincronizados".

---

### Tensión #4: Demo vs Real - RLS Invisible

**Tu demanda:**
```
Demo mode: misma interfaz, datos mock
Real mode: misma interfaz, datos Supabase
```

**Lo que pasá:**
```
Demo:
  const data = demoStore.appointments.list()
  // Devuelve lista sin filtro RLS
  // El frontend ve "funciona perfecto"

Real:
  const data = supabase.from('appointments').select()
  // RLS filtra por org_id
  // El frontend ve "funciona perfecto"
  
PERO: En demo nunca alguien intenta ver org ajena.
     En real sí, y RLS lo bloquea.
```

**La asimetría:**
- Tu "contrato lógico" es: "mismo hook, mismo formato"
- Tu "seguridad lógica" es: diferente (demo sin RLS, real con RLS)
- El test que pasá en demo puede fallar en real

**Es lógico**: La abstracción (hook) es isomórfica.
**Lo honesto**: "La seguridad entre ambientes es diferente".

---

### Tensión #5: Validación de Negocio Faltante

**Tu modelo de turnos:**
```
abro modal
  ↓
elijo cliente/servicio/empleado/fecha/hora
  ↓
hook.createAppointment()
  ↓
inserta en Supabase
```

**Lo que NO validas:**
```
¿Este empleado hace este servicio?
¿Este horario no está ocupado?
¿El salón abre ese día?
¿El cliente tiene este servicio en su historial?
¿El empleado está disponible?
```

**Tu sistema hoy dice:**
```
"Todo turno con salon_id válido es válido"
```

**El negocio real dice:**
```
"Un turno válido es uno que:
  - asigna un servicio que el salón tiene
  - a un empleado que lo hace
  - en un horario que está libre
  - en un salón que abre
  - a un cliente que existe"
```

**Es lógico**: Aceptás turnos "crudos" sin reglas de negocio.
**Lo honesto**: "Hoy validás identidad pero no lógica".

---

### Tensión #6: Realtime por Recurso = Estados Intermedios Raros

**Tu arquitectura:**
```
useAppointments → subscripción A
useSalons → subscripción B
useClients → subscripción C
```

**El escenario:**
```
User cambia de salón
  ↓
setSelectedSalon("salon-B")
  ↓
useAppointments("salon-B") re-fetch [200ms]
  ↓
UI renderiza: salon = B, appointments = [viejo de A], clientes = [viejo de A]
  ↓
[200ms después] useClients re-fetch completa
  ↓
UI renderiza: salon = B, appointments = [nuevo de B], clientes = [nuevo de B]
```

**Resultado:**
- 200ms mirando datos de dos salones distintos
- Válido pero cognitivamente disonante

**Es lógico**: Cada recurso se sincroniza solo.
**Lo honesto**: "Admitís estados intermedios donde la UI es internamente inconsistente".

---

### Tensión #7: App.tsx es un Único Punto de Fallo

**Tu centralización:**
```
App.tsx sabe:
  - user
  - org
  - salon
  - tab
  
TODO lo demás depende de esto
```

**La matemática:**
```
Si App.tsx falla     → todo falla igual
Si App.tsx tarda     → todo tarda igual
Si App.tsx calcula mal → todo ve lo mismo mal
```

**Es lógico**: Centralización = consistencia fuerte.
**Lo honesto**: "Tu robustez está acoplada a un único componente".

---

### Tensión #8: Doble Llave de Organización

**Frontend:**
```
currentOrgId = localStorage.getItem('sb-current-org')
```

**Backend:**
```
RLS: WHERE org_id IN (
  SELECT org_id FROM memberships 
  WHERE user_id = auth.uid()
)
```

**¿Son la misma cosa?**
```
No necesariamente:

Caso 1: User cambió org en la BD (admin lo movió)
  Front sigue viendo org-vieja
  Back le muestra org-nueva
  Divergencia

Caso 2: localStorage se corrompió
  Front: org-123
  Back: org-456
  Divergencia

Caso 3: Token expiró
  Front: sigue pensando que está autenticado
  Back: rechaza todo
  Divergencia
```

**Es lógico**: Son dos sistemas independientes.
**Lo honesto**: "Pueden divergir. Necesitás un mecanismo para detectarlo".

---

## ✅ Lo que SÍ cierra lógicamente

```
✅ Árbol user → org → salon → recursos
   Jerarquía clara y coherente

✅ Hooks que dependen de contexto global
   Toda operación sabe dónde está

✅ RLS como guardia final
   "Aunque el front se equivoque, vos no ves nada"

✅ Demo y real con mismo contrato
   La abstracción funciona en ambos lados

✅ Lazy loading por vistas
   Reduce complejidad cognitiva
```

---

## ⚠️ Lo que está incompleto

```
⚠️ Roles aplicados a nivel org, pero no por recurso
   Necesitás granularidad

⚠️ Validación de negocio (turnos válidos)
   Hay lógica faltante en BD + frontend

⚠️ Doble fuente de "org actual"
   Pueden divergir sin detección

⚠️ Realtime por lista
   Genera estados intermedios inconsistentes

⚠️ Condiciones de carrera suaves
   Existen pero no son catastróficas
```

---

## 🎯 La Versión Honesta

**Lo que tu arquitectura ASUME:**
```
1. El cliente nunca manda datos inválidos
2. El usuario siempre está en la org correcta
3. Las listas nunca necesitan consistencia fuerte
4. El frontend y backend siempre acuerdan en org_id
5. Los roles no varían por tipo de dato
```

**La realidad del software:**
```
En producción, TODAS estas cosas pasan.
```

---

## 🚀 Qué Falta para Cerrar los Huecos

### 1. Sincronización de contexto
```javascript
// En lugar de:
useAppointments(salonId) → suscripción A
useSalons(orgId) → suscripción B
useClients(salonId) → suscripción C

// Tener:
const { appointments, salons, clients } = useOrgContext()
// Una suscripción que actualiza TODO
```

### 2. Validación de negocio en BD
```sql
CREATE TRIGGER validate_appointment_before_insert
BEFORE INSERT ON appointments
FOR EACH ROW
EXECUTE FUNCTION validate_appointment_logic();
-- Chequea: empleado hace servicio, horario libre, etc
```

### 3. Detección de divergencia org
```javascript
// En AuthContext:
if (localStorage_org !== jwt_org) {
  // Sincronizar o rechazar
  syncOrRefresh()
}
```

### 4. Roles granulares
```typescript
// En lugar de:
role: 'owner' | 'admin' | 'employee' | 'viewer'

// Tener:
permissions: {
  can_view_finances: boolean
  can_create_appointment: boolean
  can_view_salary: boolean
  can_edit_services: boolean
}
```

### 5. Batch updates en realtime
```javascript
// En lugar de:
appointments.subscribe() // actualiza sola
salons.subscribe() // actualiza sola
clients.subscribe() // actualiza sola

// Tener:
context.subscribe() // actualiza todo junto
// O: useTransition() para agrupar renders
```

---

## 📝 Conclusión

Tu arquitectura no es "mala". Es **parcialmente especificada**.

- La macro-lógica (árbol org/salon) funciona
- La micro-lógica (validación de turnos) no está implementada
- La seguridad (RLS + frontend) está redundante pero no sincronizada
- La sincronización (realtime) es correcta pero por lista

**No necesitas rediseñar. Necesitás completar.**

El sistema actual dice: "Maneja orgs y salones bien, pero asume datos válidos". En MVP eso está bien. En producción, necesitás llenar esos huecos.
