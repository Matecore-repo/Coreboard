# 🚀 COREBOARD - Sistema Multi-Tenant de Gestión de Salones

**Plataforma enterprise completa para salones de belleza con arquitectura multi-tenant, seguridad enterprise y automatización avanzada.**

[![Arquitectura](https://img.shields.io/badge/Arquitectura-Multi--Tenant-blue)](instructivos/)
[![Seguridad](https://img.shields.io/badge/Seguridad-RLS--Enterprise-green)](instructivos/seguridad-rls.md)
[![Documentación](https://img.shields.io/badge/Docs-Completa-orange)](instructivos/)

---

## 📚 Documentación Completa

Toda la documentación técnica está organizada en [`instructivos/`](instructivos/):

### 🗂️ Índice de Documentación

| Documento | Descripción | Estado |
|-----------|-------------|---------|
| [**📖 README General**](instructivos/README.md) | Índice completo y arquitectura general | ✅ Completo |
| [**👥 Alta de Usuarios**](instructivos/alta-usuarios.md) | Sistema de invitaciones y tokens | ✅ Completo |
| [**🔒 Seguridad RLS**](instructivos/seguridad-rls.md) | Políticas RLS y control de acceso | ✅ Completo |
| [**🗄️ Base de Datos**](instructivos/base-datos.md) | Estructura completa y triggers | ✅ Completo |
| [**⚙️ Funcionalidades**](instructivos/funcionalidades.md) | Features y casos de uso | ✅ Completo |
| [**💻 Desarrollo**](instructivos/desarrollo.md) | Guía técnica para devs | ✅ Completo |
| [**📊 Diagramas RLS**](instructivos/diagramas-rls.md) | Diagramas visuales de seguridad | ✅ Completo |
| [**🔄 Triggers**](instructivos/triggers-automacion.md) | Automatización y workflows | ✅ Completo |

---

## 🎯 Características Principales

- ✅ **Multi-Tenant Completo**: Aislamiento total por organización
- ✅ **Seguridad Enterprise**: RLS + tokens hashed + auditoría completa
- ✅ **Invitaciones Seguras**: Sistema de tokens de un solo uso
- ✅ **Automatización**: Triggers para comisiones, totales, notificaciones
- ✅ **Roles Granulares**: owner, admin, employee, viewer
- ✅ **Tiempo Real**: WebSockets para actualizaciones live
- ✅ **Responsive**: Optimizado para desktop y mobile
- ✅ **Modo Demo**: Testing sin datos reales

---

## 🚀 Inicio Rápido (5 minutos)

### 1. **Instalación**
```bash
npm install
```

### 2. **Configuración**
Crear `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
NEXT_PUBLIC_DEMO_MODE=false
```

### 3. **Generar Usuario de Prueba**
```bash
# Crear usuario admin para testing
node scripts/create_invitation.js owner abc123-456 admin@test.com

# Copiar el token generado y compartirlo con el usuario
# El usuario se registra con ese token
```

### 4. **Desarrollo**
```bash
npm run dev
# Acceder: http://localhost:3001
```

---

## 📋 Referencia Rápida

### 🔑 Roles del Sistema
- **`owner`**: Control total de la organización
- **`admin`**: Gestión de usuarios y configuración
- **`employee`**: Acceso operativo (turnos, clientes)
- **`viewer`**: Solo lectura

### 🛡️ Seguridad
- **RLS**: Cada usuario ve solo sus organizaciones
- **Tokens**: Invitaciones hashed de un solo uso
- **Auditoría**: Log completo de todas las acciones

### ⚙️ Automatización
- **Comisiones**: Calculadas automáticamente al completar turnos
- **Totales**: Recalculados cuando cambian servicios
- **Timestamps**: `updated_at` automático
- **Notificaciones**: Recordatorios y alertas

---

## 📚 Documentación Detallada

Para información completa, consulta [`instructivos/`](instructivos/):

- [**👥 Sistema de Invitaciones**](instructivos/alta-usuarios.md) - Tokens, roles, flujo completo
- [**🔒 Políticas RLS**](instructivos/seguridad-rls.md) - Control de acceso detallado
- [**🗄️ Base de Datos**](instructivos/base-datos.md) - Estructura, triggers, funciones
- [**⚙️ Funcionalidades**](instructivos/funcionalidades.md) - Features y casos de uso
- [**💻 Desarrollo**](instructivos/desarrollo.md) - Guía técnica para programadores
- [**📊 Diagramas**](instructivos/diagramas-rls.md) - Arquitectura visual
- [**🔄 Automatización**](instructivos/triggers-automacion.md) - Workflows y triggers

---

**Versión:** 1.0.0 • **Última actualización:** Octubre 2025
  