# Coreboard — Guía Rápida

## Qué es
- CRM para salones/peluquerías
- Gestiona turnos, clientes, empleados, servicios
- Multi-org con Supabase

## Instalar
```bash
npm i
```

## Variables de entorno (.env)
```
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
```

## Ejecutar
```bash
npm run dev
```

Abre http://localhost:3000

## Estructura
- `pages/` → Rutas (login, dashboard)
- `src/App.tsx` → App principal
- `src/components/` → UI y features
  - `views/` → Vistas principales (Home, Finances, Settings, etc)
  - `sections/` → Secciones complementarias (Clients, Employees)
  - `features/` → Features complejos reutilizables
    - `appointments/` → Calendario, diálogos de turnos
    - `finances/` → Gráficos de finanzas
  - `ui/` → Componentes sin estado (Button, Card, etc)
  - `empty-states/` → Estados vacíos
- `src/contexts/AuthContext.tsx` → Autenticación
- `src/hooks/` → Datos (appointments, salons, clients, employees, services)
- `src/lib/supabase.ts` → Cliente
- `infra/db/` → Base de datos y RLS

## Features
- Calendario de turnos
- Gestión de clientes/empleados
- Servicios por salón
- Autenticación con Supabase
- Multi-organización con RLS
- Modo demo sin backend

## Testing
```bash
npx playwright test
```

## Build producción
```bash
npm run build
npm start
```

## Datos principales
- `organizations` → Organizaciones
- `salons` → Locales
- `services` → Servicios
- `clients` → Clientes
- `employees` → Empleados
- `appointments` → Turnos

## Scripts disponibles
```bash
node scripts/create_test_user.js      # Crear usuario de prueba
node scripts/invite_employee.js       # Invitar empleado
node scripts/create_invitation.js     # Crear invitación genérica
node scripts/reset_password.js        # Resetear contraseña
```

Excelente, arquitecto de autómatas 😎

Tu IA ya quedó con un **pipeline lógico cerrado**. Eso significa que si mañana le metés otro frontend, otro canal (WhatsApp, kioskito web, app mobile) o incluso un agente que crea turnos por voz, **todos van a pasar por la misma aduana lógica**. Eso es exactamente lo que queríamos.

Te dejo el mapa de lo que tenés ahora y lo que podés sumar después.

---

## 🧠 Lo que ya tenés

1. **Context validator**

   * No hay org fantasma. Si front y server no coinciden → lo dice.

2. **State manager de salón**

   * Si estás cambiando de salón → no te deja hacer cosas peligrosas.

3. **Validator de turnos**

   * No acepta turnos “crudos”, solo los que respetan servicio, empleado, horario.

4. **Permission resolver (RBAC → acción)**

   * No más “el empleado vio finanzas porque el front las mostraba”.

5. **Demo adapter (demo que no miente)**

   * Demo y real usan la misma lógica de validación. Demo no te engaña.

6. **Operation validator**

   * Única puerta de entrada. 5 estados posibles, nada raro:

   ```text
   valido
   invalido
   inconsistente
   inconsistente-temporal
   rechazado-por-permisos
   ```

---

## 🧪 Qué falta para un CRM “profesionalmente hincha pelotas”

Esto ya es fase 2, pero te lo tiro porque sé que vas a llegar ahí:

1. **Auditoría**

   * cada rechazo debería dejar: quién, qué operación, por qué, en qué org
   * esto después lo lee un panel de admins

2. **Sugeridor de alternativas**

   * cuando el turno es inválido por choque de horario, devolver huecos cercanos
   * esto lo puede hacer otro agente usando el mismo contexto validado

3. **Normalizador de payloads**

   * hoy asumimos que todos mandan el mismo shape
   * creá un paso “normalize” antes del validador (por si mañana viene otro canal)

4. **Políticas por salón**

   * ahora todo es por org
   * algunos salones van a querer reglas propias (ej. “no turnos sin teléfono”)

---

## 🧬 Por qué esto está bueno de verdad

Porque lograste separar:

* **quién puede** (permissionResolver)
* **dónde puede** (contextValidator + salón)
* **qué puede** (appointmentValidator)
* **cuándo puede** (contextStateManager)
* **en qué entorno** (demoAdapter)

Eso es diseño de agentes con cabeza. Cada uno hace UNA cosa. Si mañana metés un “agente de notificaciones” o un “agente de IA que completa turno por voz”, lo único que tiene que hacer es **llamar al operation validator** y dejar que él decida.

El mundo más ordenado, la UI más libre, y vos con menos tickets raros.

Seguís vos ahora con la parte sexy: usar esto para automatizar turnos desde canales externos. Ese es el próximo nivel 🧗‍♂️
