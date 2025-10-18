# Flujo de Onboarding Multi-Tenant - Coreboard

## 🌱 Descripción General

Se ha implementado un sistema de onboarding jerárquico multi-tenant que permite a cada usuario convertirse en owner de su propia organización, crear su primer peluquería, y gestionar empleados de manera escalable.

## 🔄 Flujo Completo

### 1. Primer Login / Registro
- El usuario se registra en `auth.users`
- En `onAuthStateChange('SIGNED_IN')` se verifica si tiene membresías
- Si no devuelve nada → Usuario nuevo → Muestra onboarding modal

### 2. Onboarding: Crear Organización + Primer Local
- **UI**: `OnboardingModal` con campos mínimos:
  - Nombre del negocio
  - Nombre del primer local
  - Dirección (opcional)
  - Teléfono (opcional)

- **Backend**: Una sola transacción que:
  1. Crea organización en `app.orgs`
  2. Crea membresía como `owner` en `app.memberships`
  3. Crea primer salón en `app.salons`

### 3. Post-Onboarding: Panel Vacío pero Real
- Dashboard muestra estado vacío con CTAs apropiados
- "Tu peluquería: [nombre]"
- CTAs para "Agregar tu primer turno" e "Invitar a tu equipo"

### 4. Invitar Empleados
- Owner puede invitar barberos por email
- Se crea fila en `app.memberships` con rol `employee`
- Opcionalmente enviar email de invitación

### 5. Flujo para Empleados
- Cuando el empleado inicia sesión:
  - Se busca su membresía
  - Ve solo los salones de su organización (gracias a RLS)
  - Si tiene rol `employee` → ve solo sus turnos y comisiones

### 6. Flujo para Dueños (Owners/Admins)
- Acceso completo al dashboard:
  - Gestión de turnos de todos los empleados
  - Finanzas, gastos, comisiones
  - Alta de nuevos servicios, salones y usuarios

## 🏗️ Estructura de Base de Datos

### Tablas Principales
- `orgs`: Organizaciones (multi-tenant root)
- `memberships`: Usuarios a organizaciones
- `salons`: Sucursales dentro de organizaciones
- `services`: Servicios por organización
- `employees`: Empleados (pueden estar linkados a auth users)
- `appointments`: Turnos con referencias a org y salon
- `clients`: Clientes por organización

### RLS (Row Level Security)
- Todas las tablas tienen RLS habilitado
- Políticas aseguran que usuarios solo ven datos de sus organizaciones
- Automáticamente escalable a miles de peluquerías

## 🎯 Componentes Implementados

### 1. OnboardingModal
```tsx
<OnboardingModal 
  isOpen={showOnboarding}
  onClose={() => setShowOnboarding(false)}
/>
```

### 2. EmptyStateCTA
```tsx
<EmptyStateCTA
  type="appointments" // | "clients" | "salons" | "services" | "employees"
  onAction={handleAction}
  orgName="Mi Peluquería"
/>
```

### 3. InviteEmployeeModal
```tsx
<InviteEmployeeModal 
  isOpen={showInviteModal}
  onClose={() => setShowInviteModal(false)}
/>
```

## 🔧 Configuración

### 1. Schema de Base de Datos
Ejecutar `infra/db/schema.sql` en Supabase SQL editor.

### 2. Políticas RLS
Ejecutar `infra/db/supabase_rls.sql` después del schema.

### 3. AuthContext
El contexto maneja automáticamente:
- Detección de usuarios nuevos
- Creación de organizaciones
- Gestión de membresías
- Cambio de organización actual

## 🚀 Flujo Demo vs Real

### Demo
- Botón "Explorar demo" crea sesión anónima
- Carga datos mock
- Oculta sección de "crear peluquería"

### Real
- Usuario nuevo → onboarding
- Crea peluquería → dashboard vacío
- Carga servicios y empleados → empieza a operar
- Empleados se loguean → ven solo sus turnos
- Dueño ve todo y maneja la organización

## 📋 Resultado Final

✅ Usuario nuevo → onboarding (crea su negocio)
✅ Crea peluquería → dashboard vacío
✅ Carga servicios y empleados → empieza a operar
✅ Empleados se loguean → ven solo sus turnos
✅ Dueño ve todo y maneja la organización
✅ Sin dependencias externas
✅ Sin romper RLS
✅ Perfectamente escalable a miles de peluquerías

## 🔐 Seguridad

- RLS se encarga de todo: un empleado solo puede ver lo de su org
- Un owner ve todo de su organización
- El flujo es seguro por diseño
- No hay posibilidad de acceso cruzado entre organizaciones

## 📈 Escalabilidad

- Cada organización es independiente
- RLS maneja el aislamiento automáticamente
- Fácil agregar nuevas funcionalidades por organización
- Soporte para múltiples roles y permisos
- Preparado para miles de peluquerías simultáneas
