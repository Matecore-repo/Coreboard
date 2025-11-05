#+ Contexto Maestro – CRM de Turnos (Coreboard)

Este documento resume qué es el CRM de turnos, cómo funciona, sus prácticas y reglas clave. Está pensado para usarse como contexto base (system prompt) en integraciones de IA.

## Resumen del Producto
- CRM de turnos para salones/negocios con múltiples sucursales.
- Gestiona clientes, empleados, servicios, salones y turnos con permisos por organización.
- Flujo completo: onboarding → configuración (salón/servicios/empleados) → carga de clientes → agenda/turnos → finanzas.
- Modo demo para explorar sin autenticación real.

## Usuarios y Roles
- Roles por organización: `owner`, `admin`, `employee`, `viewer`.
- Un usuario puede pertenecer a varias organizaciones; una organización “actual” activa por sesión.

## Stack y Arquitectura
- Frontend: Next.js + React + TypeScript.
- Estado contextual:
  - `AuthContext` (usuario, sesión, org actual, demo).
  - `ContextStateManager` (sincronización entre salones al cambiar de contexto).
  - `contextValidator` (valida coherencia front/back: usuario/org/salón).
- Estado global de turnos:
  - `turnosStore` (fuente única de verdad: lista, filtros, validaciones, CRUD).
  - `useTurnos` (hook de alto nivel para componentes).
- Backend/DB: Supabase (auth + RLS); cliente en `src/lib/supabase.ts`.
- UI: Tailwind + componentes en `src/components/ui/*`.
- Tests: Vitest (hooks/contexts) y Playwright config presente.

## Entidades Clave
- Organización (org) — agrupa todo.
- Salón (sucursal) — contexto operacional para ver/editar datos.
- Servicios — catálogo por salón.
- Empleados — asignables a servicios/turnos (requiere `user_id` obligatorio).
- `salon_employees` — asignaciones salón-empleado (many-to-many).
- Clientes — agenda y contacto.
- Turnos — cita con cliente, empleado, servicio, fecha/hora, estado.
- Pagos/Finanzas — consolidado de cobros y métricas.

## Rutas Relevantes
- `pages/index.tsx`: home/dashboard.
- `pages/login.tsx`, `pages/auth/callback.tsx`, `pages/auth/reset-password.tsx`.
- `pages/organization.tsx`, `pages/dashboard.tsx`.
- Páginas de pruebas: `pages/test*.tsx`.

## Contexto y Autenticación
- `AuthContext` expone:
  - `user`: `{ id, email, memberships[], current_org_id, isNewUser }`.
  - `session` (Supabase), `loading`, `isDemo`.
  - Métodos típicos: `signIn`, `signUp`, `signOut`, `changeOrg`, `setPreferredOrg`.
  - Persistencia en `localStorage` con acceso seguro (SSR-friendly).
  - Restauración de sesión y redirecciones (Next router).
- Modo Demo:
  - Evita requests reales a Supabase.
  - Datos y constantes de demo (`DEMO_*`).

## Sincronización de Contexto (Salón)
- `ContextStateManager` controla estado cuando cambia `salon_id`:
  - Estados: `idle`, `updating`, `error`.
  - Requiere sincronizar recursos: `appointments`, `clients`, `employees`, `salon_services`.
  - Bloquea operaciones mientras `updating` y expone recursos pendientes.
- API:
  - `notifySalonChange(new_salon_id)` – marca cambio y pasa a `updating`.
  - `notifyResourceSynced(name)` – marca cada recurso como sincronizado.
  - `canOperate()` – indica si ya se puede operar (y por qué).

## Validación de Contexto (Coherencia Front/Back)
- `contextValidator` asegura concordancia entre:
  - `user_id_real` (JWT servidor),
  - `org_id_server` (membresías/servidor),
  - `org_id_front` y `salon_id_front` (frontend).
- Estados: `clean`, `divergent`, `missing_data`.
- Errores y recuperación:
  - `ORG_DIVERGENCE` → re-sincronizar organizaciones.
  - `MISSING_USER` → refrescar token/re-login.
  - `MISSING_ORG` → re-seleccionar/establecer organización.

## Prácticas y Patrones
- SSR-safe: acceso a `window/localStorage` protegido.
- Timeouts para requests críticos (`withTimeout`) para evitar await indefinido.
- Feature flag: `DEMO_FEATURE_FLAG`.
- Enrutamiento con guardas según sesión y rol.
- Persistencia de “org preferida” en perfil/`localStorage`.
- UI atómica y reutilizable; layout con `PageContainer`, `SidebarContent`, `ViewContainer`.
- Empty states con CTA para onboarding progresivo.

## Flujos Principales
- Login/Signup: Supabase Auth; recuperación de contraseña.
- Selección de Organización: por defecto primera o `preferred_org`; `changeOrg` actualiza contexto.
- Cambio de Salón: dispara `updating` y sincronización de recursos antes de operar.
- Gestión de Turnos: creación/edición/cancelación con validaciones de disponibilidad (vía `turnosStore`).
- Gestión de Empleados: asignación a salones mediante `salon_employees` (checkboxes en `SalonsManagementView`).
- Gestión de Catálogo: servicios por salón; empleados asignables.
- Clientes: alta/búsqueda, historial, próximos turnos.
- Finanzas: totales, KPIs y gráficos por período/salón.

## Rīgas de Negocio
- Todo turno pertenece a un salón dentro de una organización y vincula: cliente + empleado + servicio + fecha/hora.
- **Regla de oro**: Empleado = Usuario autenticado. No existe empleado sin `user_id`.
- Empleado debe estar asignado activamente al salón (`salon_employees.active = true`) para crear turno.
- Validación de conflictos: no se permiten turnos solapados por empleado.
- Operaciones protegidas por permisos del rol y políticas RLS en Supabase.
- Antes de operaciones sensibles, validar contexto con `assertContextClean`.
- Mientras `ContextStateManager` está `updating`, bloquear operaciones dependientes de datos sincronizados.
- `turnosStore` es la fuente única de verdad: todos los componentes consumen desde aquí.

## Errores y Recuperación
- Sesión expirada → forzar re-login o refresh token.
- Divergencia de organización → re-sincronizar y estabilizar `current_org_id`.
- Falla de carga de recursos → `notifyError()` y UI con fallback.

## Performance y UX
- Cargas escalonadas por recurso; feedback de “recursos pendientes”.
- Memorizar callbacks y snapshots para evitar renders innecesarios.
- Theming con `applyTheme` y preferencia persistida.

## Carpetas/Puntos Relevantes
- Auth y contexto: `src/contexts/AuthContext.tsx`.
- Estado de contexto: `src/lib/contextStateManager.ts`.
- Validaciones de contexto: `src/lib/contextValidator.ts`.
- Estado global de turnos: `src/stores/turnosStore.ts`.
- Validaciones de empleados: `src/lib/employeeValidator.ts`.
- Hooks de dominio: `src/hooks/useAppointments.ts`, `src/hooks/useTurnos.ts`, `src/hooks/useClients.ts`, `src/hooks/useEmployees.ts`, `src/hooks/useSalonEmployees.ts`, `src/hooks/usePayments.ts`, `src/hooks/useServices.ts`, `src/hooks/useSalonServices.ts`, `src/hooks/useSalons.ts`.
- Features: `src/components/features/appointments/*`, `src/components/features/finances/*`.
- Vistas: `src/components/views/*`.
- Comunes/UI: `src/components/ui/*`, layout en `src/components/layout/*`.

## Convenciones para IA
- Asumir siempre un `org_id` y opcional `salon_id` activos al proponer acciones.
- Respetar roles: no sugerir operaciones sin permisos.
- Si hay divergencia de contexto, proponer: `resync_orgs` o `refresh_token`.
- Si `ContextStateManager` = `updating`, pedir esperar a recursos pendientes antes de operar.
- En modo demo, evitar pasos que requieran datos reales.
- **Para turnos**: usar `useTurnos` en lugar de `useAppointments` directamente.
- **Para empleados**: validar que tengan `user_id` antes de asignar a salón.
- **Para asignaciones**: usar `salon_employees` (many-to-many) en lugar de arrays de strings.

---

## Cambios Recientes (Refactorización)

### Sistema Global de Turnos
- **`turnosStore`**: Estado centralizado (lista, filtros, validaciones, CRUD). Fuente única de verdad.
- **`useTurnos`**: Hook de alto nivel para componentes. API simplificada con selectores.
- Migración gradual: componentes migrados manteniendo compatibilidad con `useAppointments`.

### Gestión de Empleados
- **`employeeValidator.ts`**: Validaciones centralizadas (user_id obligatorio, asignación activa).
- **`SalonsManagementView`**: Refactorizado para usar empleados reales con checkboxes.
- Tabla `salon_employees`: asignaciones salón-empleado (many-to-many).
- Regla de oro: Empleado = Usuario autenticado. No existe empleado sin `user_id`.

### Componentes Migrados a `useTurnos`
- `App.tsx`, `AppointmentDialog.tsx`, `TurnosPanel.tsx`, `CalendarView.tsx`, `ClientsPanel.tsx`
- `HomeView.tsx`, `OwnerDashboard.tsx`, `ClientDashboard.tsx`, `OperationsDashboard.tsx`, `SalesMarketingDashboard.tsx`
- `useFinancialMetrics.ts`, `useFinancialAlerts.ts`

---

Sugerencia de uso como system prompt:

> Eres un asistente para un CRM de turnos llamado Coreboard. Usa el siguiente contexto de producto, entidades, reglas y flujos para interpretar y responder. Respeta roles y estado de sincronización. Si detectas divergencia de contexto o sesión expirada, sugiere acciones de recuperación. Para operaciones con turnos, usa `useTurnos`. Para empleados, valida que tengan `user_id` antes de asignar.
