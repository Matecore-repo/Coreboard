# Historial de Versiones - Coreboard

## Versión Actual: 0.1.0

**Fecha:** 2024-12-19  
**Estado:** En desarrollo

### Características Principales

- Sistema de autenticación con Supabase
- Gestión multi-organización con RLS (Row Level Security)
- Sistema de turnos y citas
- Gestión de clientes y empleados
- Integración con Mercado Pago para pagos
- Checkout público para reservas
- Gestión de servicios por salón
- Sistema de comisiones
- Registro diario de caja
- Alertas financieras
- Exportación de datos financieros

### Cambios en v0.1.0

#### Integración de Mercado Pago
- Implementación de OAuth para conexión con Mercado Pago
- Sistema de refresh tokens para mantener sesiones activas
- Edge Functions para gestión de tokens y pagos
- Validación HMAC para webhooks
- Sistema de desconexión de cuentas

#### Checkout Público
- Edge Functions para obtener servicios y estilistas
- Sistema de disponibilidad en tiempo real
- Creación de turnos desde checkout público
- Links de pago personalizados

#### Mejoras de Base de Datos
- Migración `enhance_payment_links.sql` para mejorar sistema de pagos
- Actualización de esquema de appointments y commissions
- Mejoras en la lógica de creación de comisiones

#### Correcciones
- Fix de errores de TypeScript en PaymentLinkModal y useAppointments
- Corrección en validación HMAC en mp-signature.ts
- Webhooks ahora rechazan requests inválidos (401)

#### Documentación
- Documentación de configuración de Mercado Pago
- Guías de validadores y arquitectura
- Documentación de setup y desarrollo

### Stack Tecnológico

- **Frontend:** Next.js 14.2.33, React 18.1, TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **UI:** Radix UI, Tailwind CSS, Lucide Icons
- **State Management:** React Context, Custom Hooks
- **Forms:** React Hook Form
- **Pagos:** Mercado Pago API

### Próximas Versiones

#### v0.2.0 (Planeada)
- Mejoras en sincronización de contexto
- Validación de negocio en base de datos
- Permisos granulares por recurso
- Roles por recurso (no solo por organización)
- Detección de divergencia de organización

---

**Nota:** Este archivo se actualizará con cada nueva versión del proyecto.
