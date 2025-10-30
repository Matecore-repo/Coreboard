# 📚 Instructivos COREBOARD

Sistema multi-tenant de gestión de salones de belleza con arquitectura enterprise.

## 📋 Índice

### 🚀 [Alta de Usuarios](alta-usuarios.md)
- Sistema de invitaciones con tokens de un solo uso
- Roles y permisos (owner, admin, employee, viewer)
- Flujo de registro seguro

### 🔒 [Seguridad RLS](seguridad-rls.md)
- Políticas Row Level Security
- Control de acceso por organización
- Permisos granulares por rol

### 🗄️ [Base de Datos](base-datos.md)
- Estructura multi-tenant completa
- Triggers y funciones automáticas
- Relaciones y constraints

### ⚙️ [Funcionalidades](funcionalidades.md)
- Gestión de turnos y citas
- Control de empleados y comisiones
- Reportes y finanzas

### 💻 [Desarrollo](desarrollo.md)
- Configuración del entorno
- Scripts de desarrollo
- API y hooks disponibles

## 🏗️ Arquitectura General

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   PostgreSQL    │
│   (Next.js)     │◄──►│   Auth + API    │◄──►│   Multi-tenant  │
│                 │    │                 │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       │                       │                       │
       ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Roles UI       │    │  RLS Policies  │    │  Organizations  │
│  (owner/admin/  │    │  (tenant iso-   │    │  (orgs)        │
│   employee)     │    │   lation)       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Características Principales

- ✅ **Multi-tenant**: Aislamiento completo por organización
- ✅ **Invitaciones seguras**: Tokens hashed de un solo uso
- ✅ **Control de acceso**: RLS + roles granulares
- ✅ **Tiempo real**: WebSockets para actualizaciones live
- ✅ **Responsive**: Optimizado para desktop y mobile
- ✅ **Modo demo**: Datos de prueba para desarrollo

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Ejecutar migraciones
# (se aplican automáticamente al iniciar)

# Iniciar desarrollo
npm run dev
```

Acceder a `http://localhost:3001`

---

**Versión:** 1.0.0
**Última actualización:** Octubre 2025</contents>
</xai:function_call">**Última actualización:** Octubre 2025</contents>
</xai:function_call name="write">
<parameter name="file_path">instructivos/alta-usuarios.md
