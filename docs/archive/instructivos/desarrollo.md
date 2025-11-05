# 💻 Desarrollo - Guía Técnica COREBOARD

Documentación completa para desarrolladores que trabajan en COREBOARD.

## 🏗️ Arquitectura Técnica

### Stack Principal
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **UI**: Radix UI + Lucide Icons
- **State**: React Context + Custom Hooks
- **Forms**: React Hook Form + Zod validation
- **Styling**: Tailwind CSS + CSS Variables

### Estructura de Carpetas
```
coreboard/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── ui/             # Componentes base (shadcn/ui)
│   │   ├── views/          # Páginas completas
│   │   └── features/       # Features complejos
│   ├── contexts/           # Context providers (Auth, etc.)
│   ├── stores/             # Estado global (turnosStore)
│   ├── hooks/              # Custom hooks (useTurnos, useAppointments, etc.)
│   ├── lib/                # Utilidades y configuración
│   │   ├── employeeValidator.ts  # Validaciones de empleados
│   │   ├── contextValidator.ts    # Validación de contexto
│   │   └── ...             # Otros validadores
│   ├── types/              # TypeScript definitions
│   └── styles/             # CSS global y themes
├── pages/                  # Next.js pages (App Router)
├── public/                 # Assets estáticos
├── infra/                  # Base de datos y configuración
└── scripts/                # Scripts de automatización
```

## 🚀 Inicio Rápido

### Prerrequisitos
```bash
Node.js >= 18.0
npm >= 8.0
Git
```

### Instalación
```bash
# Clonar repositorio
git clone https://github.com/your-org/coreboard.git
cd coreboard

# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env.local

# Variables requeridas
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
NEXT_PUBLIC_DEMO_MODE=false
```

### Desarrollo Local
```bash
# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Ejecutar tests
npm test

# Linting
npm run lint
```

## 🔧 Scripts de Desarrollo

### Generar Invitaciones
```bash
# Crear invitación para owner
node scripts/create_invitation.js owner <org_id> owner@empresa.com

# Crear invitación para employee
node scripts/create_invitation.js employee <org_id> empleado@empresa.com

# Con expiración custom (30 días)
node scripts/create_invitation.js admin <org_id> admin@empresa.com 30
```

### Migraciones de Base de Datos
```bash
# Aplicar migraciones (se hace automáticamente al iniciar)
# Las migraciones están en infra/db/schema.sql

# Verificar estado de BD
node scripts/db-status.js
```

### Testing
```bash
# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Tests E2E
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 📊 Base de Datos

### Conexión y Configuración
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Client administrativo (solo server-side)
export const createAdminSupabaseClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY!
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}
```

### Queries Tipos
```typescript
// Tipos seguros para queries
interface Turno {
  id: string
  clientName: string
  service: string
  date: string        // YYYY-MM-DD
  time: string        // HH:mm
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  stylist: string
  salonId: string
  notes?: string
  created_by?: string
  total_amount?: number
}

interface Employee {
  id: string
  org_id: string
  user_id: string     // OBLIGATORIO - regla de oro
  full_name: string
  email?: string
  phone?: string
  default_commission_pct?: number
  active: boolean
  deleted_at?: string | null
}

interface SalonEmployee {
  id: string
  salon_id: string
  employee_id: string
  active: boolean
  assigned_at: string
  assigned_by: string
}

// Query con RLS automático
const { data, error } = await supabase
  .from('appointments')
  .select(`
    *,
    salon:salons(name),
    client:clients(name, phone),
    items:appointment_items(
      service:services(name, duration_minutes),
      price,
      quantity
    )
  `)
  .eq('org_id', currentOrgId)
  .gte('date', startDate)
  .lte('date', endDate)
```

## 🔐 Autenticación y Autorización

### Context de Auth
```typescript
// src/contexts/AuthContext.tsx
interface User {
  id: string
  email: string
  memberships: Membership[]
  current_org_id?: string
  isNewUser: boolean
}

interface Membership {
  org_id: string
  role: 'owner' | 'admin' | 'employee' | 'viewer'
  is_primary: boolean
}

const AuthContext = createContext<{
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, token?: string) => Promise<void>
  signOut: () => Promise<void>
  claimInvitation: (token: string) => Promise<void>
} | null>(null)
```

### Hooks de Uso Común

#### useTurnos (Hook Principal) ⭐
```typescript
// src/hooks/useTurnos.ts
export const useTurnos = (salonId?: string) => {
  const { turnos, loading, filters, setFilters, selectedSalon, setSelectedSalon } = useTurnosStore()
  
  // Selectores
  const turnosByDate = useMemo(() => turnosStore.getByDate(...), [turnos])
  const turnosByStatus = useMemo(() => turnosStore.getByStatus(...), [turnos])
  
  // Acciones
  const createTurno = async (data: Partial<Turno>) => {
    const validation = turnosStore.validateTurno(data)
    if (!validation.valid) throw new Error(validation.message)
    
    const appointment = await createAppointment(data)
    turnosStore.upsert(appointment)
    return appointment
  }
  
  return {
    turnos: filteredTurnos,
    loading,
    filters,
    setFilters,
    createTurno,
    updateTurno,
    deleteTurno,
    validateTurno: turnosStore.validateTurno,
    checkConflicts: turnosStore.checkConflicts
  }
}
```

#### useAppointments (Legacy - Sincroniza con turnosStore)
```typescript
// src/hooks/useAppointments.ts
export const useAppointments = (salonId?: string) => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAppointments = async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('salon_id', salonId)
        .order('date', { ascending: true })

      if (error) throw error
      setAppointments(data || [])
      
      // Sincronizar con turnosStore
      const turnos = mapAppointmentsToTurnos(data || [])
      turnosStore.setAll(turnos)
      
      setLoading(false)
    }

    fetchAppointments()

    // Suscripción realtime
    const subscription = supabase
      .channel('appointments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `salon_id=eq.${salonId}`
      }, (payload) => {
        fetchAppointments()
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [salonId])

  return { appointments, loading, createAppointment, updateAppointment, deleteAppointment }
}
```

#### useEmployees y useSalonEmployees
```typescript
// src/hooks/useEmployees.ts
export const useEmployees = (orgId: string) => {
  // Filtra automáticamente empleados sin user_id (regla de oro)
  const employees = useMemo(() => {
    return filterValidEmployees(rawEmployees)
  }, [rawEmployees])
}

// src/hooks/useSalonEmployees.ts
export const useSalonEmployees = (salonId: string) => {
  // Gestiona asignaciones many-to-many entre salones y empleados
  return { salonEmployees, assignEmployee, unassignEmployee }
}
```

## 🎨 Componentes y UI

### Patrón de Componentes
```typescript
// Componente base con tipos
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
  }
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg"
  }

  return (
    <button
      className={clsx(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      disabled={loading}
      {...props}
    >
      {loading && <Spinner className="mr-2" />}
      {children}
    </button>
  )
}
```

### Formularios con Validación
```typescript
// src/components/forms/AppointmentForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const appointmentSchema = z.object({
  clientName: z.string().min(2, 'Nombre requerido'),
  clientPhone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Teléfono inválido'),
  date: z.date().min(new Date(), 'Fecha debe ser futura'),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora inválida'),
  services: z.array(z.string()).min(1, 'Seleccione al menos un servicio'),
  notes: z.string().optional()
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

export const AppointmentForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema)
  })

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      const { error } = await supabase.from('appointments').insert({
        ...data,
        org_id: currentOrgId,
        status: 'pending'
      })
      if (error) throw error
      toast.success('Turno creado exitosamente')
    } catch (error) {
      toast.error('Error al crear turno')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Campos del formulario */}
    </form>
  )
}
```

## 🧪 Testing

### Tests Unitarios
```typescript
// src/hooks/__tests__/useAppointments.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { useAppointments } from '../useAppointments'

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({
          data: mockAppointments,
          error: null
        }))
      }))
    }))
  }))
}

describe('useAppointments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch appointments on mount', async () => {
    renderHook(() => useAppointments('org-123'))

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('appointments')
    })
  })

  it('should return loading state initially', () => {
    const { result } = renderHook(() => useAppointments('org-123'))
    expect(result.current.loading).toBe(true)
  })
})
```

### Tests de Integración
```typescript
// tests/integration/auth-flow.test.ts
describe('Authentication Flow', () => {
  it('should create user and claim invitation', async () => {
    // 1. Crear organización
    const org = await createTestOrg()

    // 2. Generar token de invitación
    const token = await generateInvitation({
      role: 'employee',
      orgId: org.id,
      email: 'test@example.com'
    })

    // 3. Registrar usuario
    const user = await signUpWithToken('test@example.com', 'password', token)

    // 4. Verificar membresía creada
    const membership = await getUserMembership(user.id)
    expect(membership.role).toBe('employee')
    expect(membership.org_id).toBe(org.id)
  })
})
```

## 🚀 Despliegue

### Variables de Entorno
```bash
# Producción
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_DEMO_MODE=false

# Desarrollo
NODE_ENV=development
NEXT_PUBLIC_DEMO_MODE=true
```

### Build de Producción
```bash
# Build optimizado
npm run build

# Verificar bundle size
npm run analyze

# Deploy a Vercel/Netlify
npm run deploy
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## 🔍 Debugging

### Logs de Desarrollo
```typescript
// Debug mode
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Debug:', { user, session, orgId })
}

// Error boundaries
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ Error caught:', error, errorInfo)
    // Reportar a servicio de errores
  }
}
```

### Queries de Debug
```sql
-- Ver estado de RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Ver conexiones activas
SELECT pid, usename, application_name, client_addr, state
FROM pg_stat_activity
WHERE datname = current_database();

-- Ver locks activos
SELECT relation::regclass, mode, granted
FROM pg_locks l
JOIN pg_class c ON l.relation = c.oid
WHERE c.relname LIKE 'public.%';
```

## 📈 Performance

### Optimizaciones de Queries
```typescript
// Query optimizada con índices
const { data, error } = await supabase
  .from('appointments')
  .select('id, date, time, status, client_name')
  .eq('org_id', orgId)
  .gte('date', startDate)
  .order('date', { ascending: true })
  .limit(100) // Paginación
```

### Lazy Loading
```typescript
const AppointmentsList = lazy(() => import('./AppointmentsList'))

const App = () => (
  <Suspense fallback={<AppointmentSkeleton />}>
    <AppointmentsList />
  </Suspense>
)
```

### Memoización
```typescript
const filteredAppointments = useMemo(() => {
  return appointments.filter(apt =>
    apt.status === filterStatus &&
    apt.date >= dateRange.start &&
    apt.date <= dateRange.end
  )
}, [appointments, filterStatus, dateRange])
```

## 🔒 Seguridad

### Validación de Input
```typescript
import { z } from 'zod'

const userSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(['owner', 'admin', 'employee', 'viewer'])
})

const validateUser = (data: unknown) => {
  return userSchema.parse(data)
}
```

### Sanitización
```typescript
import DOMPurify from 'dompurify'

const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: []
  })
}
```

## 📚 Recursos Adicionales

### Documentación Oficial
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Herramientas de Desarrollo
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Supabase Studio](https://supabase.com/dashboard)
- [Vercel Analytics](https://vercel.com/analytics)

### Comunidad
- [Discord de Supabase](https://supabase.com/discord)
- [Next.js Community](https://nextjs.org/community)
- [Reactiflux](https://www.reactiflux.com/)

---

**Versión:** 2.0.0
**Última actualización:** Noviembre 2025

## 📋 Cambios Recientes (v2.0.0)

### Sistema Global de Turnos
- ✅ **`src/stores/turnosStore.ts`**: Estado centralizado para turnos
- ✅ **`src/hooks/useTurnos.ts`**: Hook de alto nivel (recomendado usar este)
- ✅ **`useAppointments`**: Mantenido para compatibilidad, sincroniza con turnosStore

### Gestión de Empleados
- ✅ **`src/lib/employeeValidator.ts`**: Validaciones centralizadas
- ✅ **Tabla `salon_employees`**: Asignaciones many-to-many
- ✅ **Regla de oro**: user_id obligatorio en `app.employees`
