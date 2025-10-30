# Validadores - Guía de Uso

## Iteraciones Completadas (1-3/5)

Estos validadores implementan la lógica que faltaba en la arquitectura.

---

## ✅ Iteración 1: Context Validator

**Archivo:** `src/lib/contextValidator.ts`

**Responsabilidad:** Garantizar que frontend y backend hablen del mismo contexto.

### Uso Básico

```typescript
import { validateContext, getServerContext } from '@/lib/contextValidator';
import { useAuth } from '@/contexts/AuthContext';

// En un hook o componente:
const { user } = useAuth();
const serverContext = getServerContext(user);

const frontendContext = {
  org_id: 'org-123',      // Lo que el cliente envía
  salon_id: 'salon-456',  // Lo que el cliente envía
};

const result = validateContext(frontendContext, serverContext, user);

if (result.valid) {
  // OK - usar result.context para la operación
  console.log(result.context); // { user_id_real, org_id_server, org_id_front, ... }
} else {
  // PROBLEMA
  console.error(result.error?.code); // 'ORG_DIVERGENCE' | 'MISSING_USER' | 'MISSING_ORG'
  console.error(result.error?.message);
  console.error(result.error?.recovery); // 'resync_orgs' | 'refresh_token'
}
```

### Posibles Resultados

```
✅ valid: true
   state: 'clean'
   → Contexto sincronizado

❌ valid: false
   state: 'divergent'
   error.code: 'ORG_DIVERGENCE'
   → Frontend y backend no coinciden en org_id

❌ valid: false
   state: 'missing_data'
   error.code: 'MISSING_USER' | 'MISSING_ORG'
   → Faltan datos críticos
```

---

## ✅ Iteración 2: Appointment Validator

**Archivo:** `src/lib/appointmentValidator.ts`

**Responsabilidad:** Validar que un turno cumpla TODAS las reglas de negocio.

### Uso Básico

```typescript
import { AppointmentValidator, AppointmentIntent } from '@/lib/appointmentValidator';

const validator = new AppointmentValidator(
  salons,      // MockSalon[]
  services,    // MockService[]
  employees,   // MockEmployee[]
  appointments // MockAppointment[] (turnos existentes)
);

const appointmentIntent: AppointmentIntent = {
  org_id: 'org-123',
  salon_id: 'salon-456',
  client_id: 'client-789',
  employee_id: 'emp-001',
  service_id: 'svc-001',
  starts_at: '2025-10-30T14:30:00', // ISO 8601
};

const result = validator.validate(appointmentIntent);

if (result.valid) {
  // ✅ Puede ir a la BD
  console.log(result.normalized_appointment);
} else {
  // ❌ Rompió una regla
  console.error(result.error_code); // Ver tabla abajo
  console.error(result.message);
  console.log(result.suggestions); // Sugerencias al usuario
}
```

### Validaciones en Orden

```
1. Campos requeridos (org, salon, employee, service, starts_at)
2. Formato de fecha (ISO 8601)
3. ✓ Salón pertenece a la org
4. ✓ Servicio pertenece al salón
5. ✓ Empleado trabaja en el salón
6. ✓ Empleado puede hacer el servicio
7. ✓ Salón abre ese día/hora
8. ✓ No hay conflicto horario
```

### Posibles Errores

```typescript
error_code: 'SALON_NOT_IN_ORG'
  → Salón no existe en esa org

error_code: 'SERVICE_NOT_IN_SALON'
  → Servicio no existe en ese salón

error_code: 'EMPLOYEE_NOT_IN_SALON'
  → Empleado no trabaja en ese salón

error_code: 'EMPLOYEE_CANT_DO_SERVICE'
  → Empleado no está capacitado
  suggestions: ["Asigna otro empleado", "Agrega capacidad al empleado"]

error_code: 'SALON_CLOSED'
  → Salón no abre ese día/hora
  suggestions: ["Elige otro horario", "Elige otro día"]

error_code: 'EMPLOYEE_CONFLICT'
  → Empleado ya tiene otro turno
  suggestions: ["Mueve a otro horario", "Asigna otro empleado"]
```

---

## ✅ Iteración 3: Context State Manager

**Archivo:** `src/lib/contextStateManager.ts`

**Responsabilidad:** Detectar cambios de salón y bloquear operaciones durante transiciones.

### Uso Básico

```typescript
import { getContextStateManager } from '@/lib/contextStateManager';

const stateManager = getContextStateManager();

// Cuando el usuario cambia de salón:
stateManager.notifySalonChange('salon-new-id');
// Estado cambia a 'updating'
// Se limpian todos los recursos sincronizados

// Cuando cada recurso termine de cargar:
stateManager.notifyResourceSynced('appointments');  // ✓
stateManager.notifyResourceSynced('clients');       // ✓
stateManager.notifyResourceSynced('employees');     // ✓
stateManager.notifyResourceSynced('salon_services');// ✓
// Cuando todos → Estado cambia a 'idle'

// Antes de crear un turno:
const check = stateManager.canOperate();

if (check.can_operate) {
  // ✅ Puede crear
} else {
  // ❌ Esperando sincronización
  console.log(check.reason);
  console.log(check.resources_pending); // ['appointments', 'clients', ...]
}
```

### Estados

```
'idle'      → Todo sincronizado, puede operar
'updating'  → Se está cambiando de salón, esperar
'error'     → Error crítico, recargar página
```

---

## ✅ Iteración 3.5: Operation Validator (Orquestador)

**Archivo:** `src/lib/operationValidator.ts`

**Responsabilidad:** Integrar contexto + estado + validación de negocio.

### Uso Principal

```typescript
import { validateCreateAppointment } from '@/lib/operationValidator';
import { useAuth } from '@/contexts/AuthContext';

const { user } = useAuth();

const result = validateCreateAppointment(appointmentIntent, user);

switch (result.status) {
  case 'valido':
    // ✅ Puede ir a la BD
    const payload = result.payload; // Normalizado
    await createAppointmentInDB(payload);
    break;

  case 'invalido':
    // ❌ Regla de negocio rota
    toast.error(result.message);
    console.log(result.suggestions);
    break;

  case 'inconsistente':
    // ⚠️ Org del front ≠ org del server
    toast.warning('Tu contexto está desincronizado');
    console.log(result.recovery_action); // 'resync_orgs' | 'refresh_token'
    break;

  case 'inconsistente-temporal':
    // ⏳ Está cambiando de salón
    toast.info('Espera a que se carguen todos los datos');
    console.log(result.resources_pending);
    break;
}
```

### Estados Posibles

```typescript
status: 'valido'
  → Puede ejecutarse
  → result.payload contiene la operación normalizada
  → result.context tiene el contexto sincronizado

status: 'invalido'
  → Rompió regla de negocio
  → result.error_code y result.message describen qué pasó
  → result.suggestions tiene recomendaciones

status: 'inconsistente'
  → Org del front ≠ org del server
  → result.recovery_action dice qué hacer

status: 'inconsistente-temporal'
  → Se está cambiando de salón
  → result.resources_pending lista qué falta sincronizar
```

---

## 🔗 Integración Típica en Hook

```typescript
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { validateCreateAppointment } from '@/lib/operationValidator';
import { getContextStateManager } from '@/lib/contextStateManager';
import { toast } from 'sonner';

export function useAppointmentsValidator() {
  const { user } = useAuth();

  return useCallback(async (appointmentIntent) => {
    // 1. Validar todo
    const validation = validateCreateAppointment(appointmentIntent, user);

    // 2. Decidir qué hacer
    if (validation.status !== 'valido') {
      toast.error(validation.message);
      return null;
    }

    // 3. Si OK, ir a la BD
    try {
      const result = await supabase
        .from('appointments')
        .insert(validation.payload);

      if (result.error) throw result.error;

      // Notificar que se sincronizó
      const stateManager = getContextStateManager();
      stateManager.notifyResourceSynced('appointments');

      return result.data;
    } catch (error) {
      toast.error('Error al crear turno');
      stateManager.notifyError();
      return null;
    }
  }, [user]);
}
```

---

## 📋 Checklist: Señales de que Estás Haciendo Bien

✅ Antes de crear turno, llamas a `validateCreateAppointment()`
✅ Manejas los 4 posibles estados de resultado
✅ Notificas cambios de salón con `notifySalonChange()`
✅ Notificas recursos sincronizados con `notifyResourceSynced()`
✅ Bloqueas operaciones durante `inconsistente-temporal`
✅ Los errores tienen `suggestions` para el usuario
✅ Muestras `recovery_action` cuando hay divergencia

---

## 🚀 Iteraciones Faltantes (4-5)

Los validadores 4 y 5 aún no están implementados:

- **Iteración 4:** Permission Validator (roles granulares)
- **Iteración 5:** Demo Mode Mirror (validar igual en demo y real)

Ambas siguen el mismo patrón de este documento.

---

## ✅ Iteración 4: Permission Resolver

**Archivo:** `src/lib/permissionResolver.ts`

**Responsabilidad:** Tabla de decisiones (rol, operación) → permitido/rechazado

### Uso Básico

```typescript
import { checkPermission } from '@/lib/permissionResolver';

const result = checkPermission({
  user_id: 'user-123',
  role: 'employee',  // del server, no del front
  operation: 'appointment.create.own_salon',
  scoped_org_id: 'org-456',    // lo que el server dice
  scoped_salon_id: 'salon-789', // lo que el server dice
  resource_salon_id: 'salon-789',  // lo que la operación quiere
});

if (result.permitted) {
  // ✅ Puede ejecutar
} else {
  // ❌ Rechazado
  console.log(result.reason); // 'ROL_NO_AUTORIZA_OPERACION' | 'SALON_SCOPE_VIOLATION'
}
```

### Matriz de Permisos

```
viewer:
  ✅ appointment.read.all
  ✅ client.read.all
  ✅ salon.read
  ✅ org.read
  ❌ Nada de creación/edición

employee:
  ✅ appointment: read/create/update/delete (solo own_salon)
  ✅ client: read/create/update
  ✅ finance.read: own_salon
  ❌ Nada de org.manage

admin:
  ✅ appointment: todos
  ✅ client: todos
  ✅ employee: todos
  ✅ salon: todos
  ✅ finance: todos
  ✅ org.manage
  ✅ org.invite_user
  ❌ Nada más

owner:
  ✅ TODO
```

### Operaciones Scopeadas

Las que terminan en `own_salon` requieren validación adicional:

```
'appointment.create.own_salon'
  → Puedes crear turnos, pero SOLO en tu salón
  → Si intento crear en otro salón → SALON_SCOPE_VIOLATION

'finance.read.own_salon'
  → Puedes leer finanzas de tu salón
  → Si intento leer otro salón → rechazado
```

---

## ✅ Iteración 5: Demo Adapter

**Archivo:** `src/lib/demoAdapter.ts`

**Responsabilidad:** Demo que no miente - aplica mismas validaciones que real

### Concepto

```
Demo normal:
  input → demoStore.create() → OK siempre

Demo inteligente:
  input
    ↓
  contextValidator (¿misma org?)
    ↓
  contextStateManager (¿transitando?)
    ↓
  permissionResolver (¿puede este rol?)
    ↓
  appointmentValidator (¿turno válido?)
    ↓
  demoStore.create() ← SOLO si todo pasó
```

### Uso Básico

```typescript
import { executeOperationWithDemoFallback } from '@/lib/demoAdapter';
import { isDemoMode } from '@/lib/demoAdapter';

const result = await executeOperationWithDemoFallback({
  operation: 'create_appointment',
  payload: appointmentIntent,
  user,
  onRealExecute: async (validatedPayload) => {
    // Esto solo se ejecuta en modo real
    const { data, error } = await supabase
      .from('appointments')
      .insert(validatedPayload);
    return { data, error };
  }
});

if (result.status === 'valido') {
  // ✅ Creado exitosamente
  if (result.demo_warning === 'DEMO_SECURITY_LIGHTER') {
    // ⚠️ En demo: las validaciones son iguales, pero RLS no está
  }
} else {
  // ❌ Falló por alguna razón
  console.log(result.message);
}
```

### Diferencias Demo vs Real

```
Demo:
  ✅ Mismas validaciones de contexto
  ✅ Mismas validaciones de permisos
  ✅ Mismas validaciones de negocio
  ❌ Sin RLS (Row Level Security)
  ❌ Sin persistencia en BD real
  ⚠️ Advertencia: DEMO_SECURITY_LIGHTER

Real:
  ✅ Mismas validaciones de contexto
  ✅ Mismas validaciones de permisos
  ✅ Mismas validaciones de negocio
  ✅ Con RLS
  ✅ Persistencia en Supabase
```

---

## 🔄 Pipeline Completo

Cuando el sistema recibe una operación, hace esto:

```typescript
// 1. Detectar si es demo o real
const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// 2. Ejecutar el adaptador apropiado
if (isDemo) {
  result = await adaptDemoOperation({
    operation: 'create_appointment',
    payload: appointmentIntent,
    context: { user, isDemo: true }
  });
} else {
  result = await executeOperationWithDemoFallback({
    operation: 'create_appointment',
    payload: appointmentIntent,
    user,
    onRealExecute: /* función que va a Supabase */
  });
}

// 3. El resultado SIEMPRE es uno de estos:
switch (result.status) {
  case 'valido':
    // ✅ Puede ejecutarse
    // result.payload contiene los datos normalizados
    break;
  
  case 'invalido':
    // ❌ Rompió regla de negocio
    // result.error_code y result.message describen qué pasó
    break;
  
  case 'inconsistente':
    // ⚠️ Org del front ≠ org del server
    // result.recovery_action dice qué hacer
    break;
  
  case 'inconsistente-temporal':
    // ⏳ Está cambiando de salón
    // result.resources_pending lista qué falta sincronizar
    break;
  
  case 'rechazado-por-permisos':
    // 🔒 Rol no autoriza
    // result.permission_check contiene detalles
    break;
}
```

---

## 🧪 Checklist Final (4-5 Completadas)

✅ Permisos se validan ANTES de reglas de negocio
✅ Operaciones scopeadas (own_salon) se validan en contexto
✅ Demo aplica mismas validaciones que real
✅ Demo agrega advertencia DEMO_SECURITY_LIGHTER
✅ Pipeline es idéntico: demo vs real (solo cambia persistencia)
✅ 5 estados de resultado posibles (no hay "invenciones")
✅ Todos los inputs vienen del server (nada del front sin validar)
✅ Sugerencias útiles en cada error
✅ Recovery actions claros (resync, reload, wait, refresh_token)

---

## 📊 Resumen de Iteraciones 1-5

| Iter | Archivo | Responsabilidad |
|------|---------|---|
| 1 | contextValidator | Sincronización org/usuario front vs back |
| 2 | appointmentValidator | Validación de reglas de negocio de turnos |
| 3 | contextStateManager | Bloqueo durante transiciones |
| 3.5 | operationValidator | Orquestador que integra 1+2+3 |
| 4 | permissionResolver | RBAC - matriz rol × operación |
| 5 | demoAdapter | Demo que valida igual a real |

---

## 🚀 Qué Sigue

Con estas 5 iteraciones, el sistema está listo para:
- ✅ Auditoría ("quién rechazó y por qué")
- ✅ Sugerencias de horario (IA-friendly)
- ✅ Enforcement en serverless (edge functions)
- ✅ Logging de operaciones rechazadas
- ✅ Rate limiting por rol
- ✅ Notificaciones en tiempo real
