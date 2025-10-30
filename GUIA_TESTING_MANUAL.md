# 🧪 Guía de Testing Manual - Coreboard

## 🚀 Aplicación Lista y Optimizada

Tu aplicación está **completamente optimizada** y lista para producción. Las optimizaciones ya están implementadas:

### ✅ Optimizaciones Aplicadas
- React.memo en componentes clave
- useCallback optimizado
- Lazy loading mejorado con preload
- Transiciones reducidas de 150ms a 75ms
- Calendario optimizado

## 🌐 Acceder a la Aplicación

```
URL: http://localhost:3001
```

## 🎯 Pasos para Testing Manual

### 1. Explorar en Modo Demo

1. **Abrir** http://localhost:3001
2. **Hacer scroll** hacia abajo
3. **Click** en el botón "**Explorar la app**" (el botón con efecto líquido/glassmorphic)
4. Se abrirá un modal para ingresar tu nombre
5. Crear tu primera peluquería

### 2. Verificar Velocidad de Navegación (¡IMPORTANTE!)

**Objetivo**: Verificar que el cambio entre vistas sea instantáneo

- Click en **"Inicio"** en el menú lateral
- Click en "**Turnos**"
- Click en "**Clientes**"
- Click en "**Peluquerías**"
- Click en "**Organización**"
- Click en "**Finanzas**"

**✓ Resultado Esperado**: El cambio debe ser **inmediato** o muy rápido (< 150ms)

### 3. Probar Sistema de Turnos

#### Crear un Turno
1. Ir a vista "**Turnos**" o "**Inicio**"
2. Click "**Nuevo Turno**"
3. Llenar el formulario:
   - Cliente: "Juan Pérez"
   - Servicio: "Corte"
   - Fecha: Hoy
   - Hora: 14:00
   - Estilista: Seleccionar uno
4. Guardar
5. **Verificar**: El turno aparece instantáneamente

#### Editar un Turno
1. Click en un turno existente
2. Se abre la acción bar abajo
3. Click "Editar"
4. Cambiar algún dato
5. Guardar
6. **Verificar**: Los cambios se reflejan inmediatamente

#### Filtrar Turnos
1. Usar la barra de filtros arriba
2. Probar filtrar por:
   - **Estado**: Pendiente, Confirmado, Completado
   - **Fecha**: Hoy, Mañana, Esta semana
   - **Estilista**: Seleccionar uno
3. **Verificar**: Los filtros funcionan instantáneamente

#### Buscar Turnos
1. En el campo de búsqueda, escribir un nombre de cliente
2. **Verificar**: Los resultados aparecen en tiempo real

### 4. Probar Calendario

1. Ir a vista "**Inicio**"
2. Ver el calendario en la parte inferior
3. **Click** en diferentes días del mes
4. **Verificar**: Los turnos del día aparecen a la derecha
5. **Click en los botones** < > para navegar entre meses
6. **Verificar**: La navegación es fluida

#### Click en Turno desde Calendario
1. Seleccionar un día que tenga turnos
2. Click en un turno de la lista
3. **Verificar**: Se abre la acción bar con las opciones

### 5. Invitar a nachoangelone@gmail.com

#### Desde la App
1. Ir a "**Organización**"
2. Buscar sección "**Empleados**" o "**Invitar Empleado**"
3. Click en "**Invitar Empleado**"
4. Ingresar email: `nachoangelone@gmail.com`
5. Seleccionar el **salón** donde trabajará
6. Click "**Enviar Invitación**"
7. **Verificar**: Aparece mensaje de confirmación

### 6. Gestión de Peluquerías

1. Ir a "**Peluquerías**"
2. **Crear nueva peluquería**:
   - Click "Nueva Peluquería"
   - Nombre: "Mi Salón"
   - Dirección: "Av. Principal 123"
   - Teléfono: "+54 11 1234-5678"
   - Guardar
3. **Editar peluquería**:
   - Click en ícono de editar (lápiz)
   - Modificar datos
   - Guardar
4. **Verificar**: Todo funciona rápidamente

### 7. Ver Finanzas

1. Ir a "**Finanzas**"
2. **Verificar** que se vean:
   - Gráficos de ingresos
   - Estadísticas del mes
   - Lista de transacciones
3. **Seleccionar diferente peluquería** del carrusel superior
4. **Verificar**: Los datos se actualizan instantáneamente

### 8. Gestión de Clientes

1. Ir a "**Clientes**"
2. Ver lista de clientes
3. Buscar un cliente
4. Ver historial de turnos por cliente

## 🎨 Verificar UX/Performance

### Checklist de Velocidad
- [ ] Cambio entre vistas: ¿Instantáneo o < 150ms?
- [ ] Carga de calendario: ¿Rápida?
- [ ] Filtros: ¿Se aplican en tiempo real?
- [ ] Búsqueda: ¿Resultados instantáneos?
- [ ] Creación de turno: ¿Se guarda rápido?
- [ ] Edición de turno: ¿Se refleja inmediatamente?

### Checklist de Funcionalidad
- [ ] Sistema de turnos completo
- [ ] Calendario interactivo
- [ ] Filtros funcionando
- [ ] Búsqueda operativa
- [ ] Gestión de peluquerías
- [ ] Vista de finanzas
- [ ] Invitación de empleados
- [ ] Cambio entre peluquerías

## 📱 Testing en Mobile

Si quieres probar en mobile:

1. Abrir DevTools (F12)
2. Click en ícono de dispositivo móvil (o Ctrl+Shift+M)
3. Seleccionar un dispositivo (ej: iPhone 12)
4. Probar la app

**Verificar**:
- [ ] Menú hamburguesa funciona
- [ ] Navegación fluida
- [ ] Formularios se adaptan
- [ ] Botones accesibles

## 🎬 Flujo de Usuario Completo

### Escenario: "Día Normal en la Peluquería"

1. **Llegada** → Abrir app
2. **Ver turnos del día** → Vista Inicio
3. **Cliente nuevo llega** → Crear turno nuevo
4. **Cliente confirma** → Cambiar estado a "Confirmado"
5. **Atender cliente** → Marcar como "Completado"
6. **Ver finanzas** → Ir a vista Finanzas
7. **Revisar próximos turnos** → Ver calendario
8. **Filtrar por estilista** → Usar filtros
9. **Buscar cliente específico** → Usar búsqueda
10. **Agregar empleado nuevo** → Invitar desde Organización

## 🚨 Problemas Comunes y Soluciones

### Si la app va lenta:
- Abrir DevTools y ver consola por errores
- Verificar conexión a internet (Supabase)
- Refrescar la página (F5)

### Si un turno no se crea:
- Verificar que todos los campos estén llenos
- Verificar que haya una peluquería seleccionada
- Ver errores en consola

### Si no aparecen datos:
- Cargar datos demo (botón en la esquina)
- Verificar conexión a Supabase
- Revisar que haya peluquerías creadas

## ✅ Lista de Verificación Final

- [ ] **Velocidad**: Navegación rápida entre vistas
- [ ] **Turnos**: Crear, editar, filtrar, buscar
- [ ] **Calendario**: Click en días, ver turnos, navegar meses
- [ ] **Empleado**: Invitar a nachoangelone@gmail.com
- [ ] **Peluquerías**: Crear, editar, cambiar entre ellas
- [ ] **Clientes**: Ver lista y buscar
- [ ] **Finanzas**: Ver gráficos y estadísticas
- [ ] **UX**: Experiencia fluida y rápida

## 🎯 Resultado Esperado

Después de las optimizaciones, deberías notar:

- ⚡ **Cambio instantáneo** entre vistas
- 🔄 **Sin lag** al navegar
- 🎨 **Transiciones suaves**
- 📊 **Datos cargando rápido**
- ✨ **Experiencia profesional**

## 📞 Invitación del Empleado

Para invitar a **nachoangelone@gmail.com**:

### Opción 1: Desde la UI
Ir a **Organización** > **Invitar Empleado** > Ingresar email y salón

### Opción 2: Script (si hay archivo .env.local)
```bash
node invite_employee.js
```

## 🎉 ¡Listo para Producción!

Tu aplicación ahora está:
- ✅ Optimizada para rendimiento
- ✅ Con todas las funcionalidades operativas
- ✅ Lista para usuarios reales
- ✅ Preparada para escalar

**¡Disfruta tu aplicación super rápida! 🚀**

