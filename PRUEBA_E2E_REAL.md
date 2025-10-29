# 🧪 PRUEBA E2E REAL - GUÍA PASO A PASO

**Fecha:** Octubre 29, 2025
**Usuario Test:** iangel.oned@gmail.com / 123456
**Objetivo:** Validar TODO funciona completamente

---

## ⚡ INICIO RÁPIDO

```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Abrir navegador
# http://localhost:3000
```

---

## 📋 CHECKLIST E2E COMPLETO

### FASE 1: AUTENTICACIÓN ✅

```
[ ] 1. Ir a http://localhost:3000
[ ] 2. Ver formulario de login
[ ] 3. Ingresar:
      Email: iangel.oned@gmail.com
      Contraseña: 123456
[ ] 4. Click "Ingresar"
[ ] 5. Esperar a que cargue Home
[ ] 6. Ver sidebar con opciones (Inicio, Gestión, etc)
```

**Resultado Esperado:** 
- ✅ Redirige a `/`
- ✅ Navbar visible
- ✅ Sin errores en consola

---

### FASE 2: SERVICIOS (CONFIGURACIÓN) ✅

```
[ ] 1. Click en "Gestión" (sidebar)
[ ] 2. Click en "Configuración" o "Settings"
[ ] 3. Ver sección "Servicios"
[ ] 4. Si dice "No hay servicios creados":
      - Click "+ Crear primer servicio"
[ ] 5. Llenar:
      - Nombre: "Corte"
      - Precio: 25
      - Duración: 30 min
[ ] 6. Click "Crear"
[ ] 7. Ver toast "Servicio creado"
[ ] 8. Servicio aparece en lista
[ ] 9. Agregar 2 servicios más:
      - "Teñido" - $50 - 60 min
      - "Manicure" - $15 - 20 min
```

**Resultado Esperado:**
- ✅ 3 servicios creados
- ✅ Listados en Configuración
- ✅ Sin errores en consola
- ✅ Datos guardados en BD

---

### FASE 3: PELUQUERÍAS (CREAR/EDITAR/BORRAR) ✅

#### 3.1: CREAR PELUQUERÍA
```
[ ] 1. Click en "Gestión" → "Peluquerías"
[ ] 2. Click "+ Nueva peluquería"
[ ] 3. Llenar:
      - Nombre: "Studio Principal"
      - Dirección: "Av. Corrientes 1234"
      - Teléfono: "+54 9 11 1234-5678"
[ ] 4. Click "Crear peluquería"
[ ] 5. Ver toast "Peluquería creada"
[ ] 6. Aparece en lista
```

#### 3.2: ASIGNAR SERVICIOS A PELUQUERÍA
```
[ ] 1. Click en "Studio Principal" (desde lista)
[ ] 2. Scroll hacia abajo a "Servicios de Studio Principal"
[ ] 3. Ver botón "Asignar Servicio"
[ ] 4. Click "Asignar Servicio"
[ ] 5. Seleccionar "Corte" (del dropdown)
[ ] 6. Ver que aparece en lista con precio
[ ] 7. Repetir para otros servicios (Teñido, Manicure)
[ ] 8. Todos los servicios deben estar asignados
```

#### 3.3: EDITAR PELUQUERÍA
```
[ ] 1. Con "Studio Principal" seleccionado
[ ] 2. Click "Editar peluquería"
[ ] 3. Cambiar nombre a "Studio Principal - Centro"
[ ] 4. Click "Guardar cambios"
[ ] 5. Ver que se actualizó en lista
```

#### 3.4: CREAR OTRA PELUQUERÍA
```
[ ] 1. Click "+ Nueva peluquería"
[ ] 2. Llenar:
      - Nombre: "Studio Flores"
      - Dirección: "Calle Flores 567"
      - Teléfono: "+54 9 11 9876-5432"
[ ] 3. Crear y asignar al menos 1 servicio
```

#### 3.5: BORRAR PELUQUERÍA
```
[ ] 1. Seleccionar una peluquería
[ ] 2. Click "Eliminar peluquería"
[ ] 3. Confirmar en dialogo
[ ] 4. Ver que desapareció de lista
```

**Resultado Esperado:**
- ✅ Crear/editar/borrar funcionan
- ✅ Servicios asignados correctamente
- ✅ Lista se actualiza sin refresh
- ✅ Sin errores en consola

---

### FASE 4: EMPLEADOS ✅

```
[ ] 1. Click en "Gestión" → "Personal"
[ ] 2. Click "+ Nuevo Empleado"
[ ] 3. Llenar:
      - Nombre: "Juan Peluquero"
      - Email: "juan@salon.com"
      - Teléfono: "+54 9 11 5555-5555"
[ ] 4. Click "Crear"
[ ] 5. Ver toast "Empleado creado"
[ ] 6. Aparece en lista
[ ] 7. Crear 2-3 empleados más
[ ] 8. Intentar editar un empleado
[ ] 9. Intentar borrar un empleado (con confirmación)
```

**Resultado Esperado:**
- ✅ Empleados creados
- ✅ Listados
- ✅ Editar/borrar funcionan
- ✅ Sin errores

---

### FASE 5: CLIENTES ✅

```
[ ] 1. Click en "Gestión" → "Clientes"
[ ] 2. Si dice "Agregar cliente próximamente":
      - ⚠️ PROBLEMA: No hay interfaz de clientes
[ ] 3. Si funciona:
      [ ] Click "+ Nuevo Cliente"
      [ ] Llenar: Nombre, teléfono, email
      [ ] Crear 2-3 clientes
```

**Nota:** Si dice "próximamente", es normal por ahora.

---

### FASE 6: TURNOS (LO MÁS IMPORTANTE) ✅

```
[ ] 1. Click en "Inicio" (volver a home)
[ ] 2. Ver calendario
[ ] 3. Click "+ Nuevo Turno" o en un horario
[ ] 4. Llenar:
      - Peluquería: "Studio Principal - Centro"
      - Servicio: "Corte"
      - Empleado: "Juan Peluquero"
      - Cliente: Ingresar nombre
      - Teléfono: Número cliente
      - Email: Email cliente
[ ] 5. Click "Crear Turno"
[ ] 6. Ver toast "Turno creado"
[ ] 7. Turno aparece en calendario
[ ] 8. Crear 2-3 turnos en diferentes horarios
```

#### 6.1: EDITAR TURNO
```
[ ] 1. Click en turno en calendario
[ ] 2. Ver detalles en modal/panel
[ ] 3. Click "Editar"
[ ] 4. Cambiar estado (pending → confirmed)
[ ] 5. Agregar nota
[ ] 6. Guardar
[ ] 7. Ver cambios en calendario
```

#### 6.2: BORRAR TURNO
```
[ ] 1. Seleccionar un turno
[ ] 2. Click "Eliminar"
[ ] 3. Confirmar
[ ] 4. Ver que desapareció del calendario
```

**Resultado Esperado:**
- ✅ Turnos creados y visibles
- ✅ Editar funciona
- ✅ Borrar funciona
- ✅ Calendario se actualiza
- ✅ Sin errores

---

### FASE 7: INVITACIONES (USUARIOS NUEVOS) ✅

```
[ ] 1. Click en "Organización"
[ ] 2. Esperar que cargue datos (puede tardar)
[ ] 3. Si dice "No hay datos":
      [ ] Click "Reintentar" o "Refrescar"
[ ] 4. Click "+ Invitar Miembro"
[ ] 5. Llenar:
      - Email: "newemp@salon.com"
      - Rol: "Empleado"
[ ] 6. Click "Crear Invitación"
[ ] 7. Ver token generado
[ ] 8. Copiar token
```

**Resultado Esperado:**
- ✅ Invitación creada
- ✅ Token mostrado
- ✅ Sin errores

---

### FASE 8: ORGANIZACIÓN (DATOS) ✅

```
[ ] 1. En "Organización" tab
[ ] 2. Ver datos de org:
      [ ] Nombre
      [ ] Tax ID
      [ ] Creada el (fecha)
[ ] 3. Click "Miembros"
[ ] 4. Ver lista de miembros con roles
[ ] 5. Si no carga:
      [ ] Click "Refrescar página" (Ctrl+R)
      [ ] O Click "Reintentar"
```

**Resultado Esperado:**
- ✅ Datos de org visibles
- ✅ Miembros listados
- ✅ Roles visibles
- ✅ Sin errores (o error con opción de reintentar)

---

### FASE 9: FLUJO COMPLETO (INTEGRACIÓN) ✅

```
Simulación de workflow real:

[ ] 1. Login ✅
[ ] 2. Crear 2 peluquerías con servicios ✅
[ ] 3. Crear 3-4 empleados ✅
[ ] 4. Crear 5-10 turnos en calendario ✅
[ ] 5. Editar algunos turnos (cambiar estado) ✅
[ ] 6. Invitar 2 usuarios nuevos ✅
[ ] 7. Ver organización y miembros ✅
[ ] 8. Navegación suave entre secciones ✅
[ ] 9. Sin "freezes" o lentitud ✅
[ ] 10. Sin errores en consola ✅
```

---

### FASE 10: CONSOLA (ERROR CHECKING) ✅

```
[ ] 1. Abrir DevTools (F12)
[ ] 2. Ir a "Console"
[ ] 3. Ver que NO haya:
      [ ] Uncaught errors (rojo)
      [ ] Errores 404
      [ ] "Cannot access 'X' before initialization"
      [ ] "Attempting to use a disconnected port"
[ ] 4. Algunos warnings (amarillo) son normales
```

**Resultado Esperado:**
- ✅ Console limpia (sin errores rojos)
- ✅ Warnings no son bloqueantes

---

## 📊 REPORTE FINAL

### Funcionalidades DEBEN Estar Presentes ✅

```
✅ Login/Logout
✅ Crear/Editar/Borrar Peluquerías
✅ Crear/Editar/Borrar Servicios
✅ Asignar servicios a peluquerías
✅ Crear empleados
✅ Crear turnos
✅ Ver turnos en calendario
✅ Editar/borrar turnos
✅ Crear invitaciones
✅ Ver organización y miembros
✅ Sin errores críticos en consola
```

### Funcionalidades "Próximamente" (OK)

```
⏳ Agregar cliente directamente (puede crearse con turno)
⏳ Some RLS tests por rol (admin/employee)
⏳ Cross-browser tests
```

---

## 🚀 TESTING CON PLAYWRIGHT (Opcional)

```bash
# Ver tests en vivo
npm run e2e:ui

# O ejecutar en headless
npm run e2e
```

---

## 📞 SI ALGO FALLA

### Error: "404 en salon_services"
→ BD no tiene tabla → Ejecutar SQL de creación

### Error: "Organización no carga"
→ Click "Refrescar" (Ctrl+R) → Reintentar

### Error: "Servicio no aparece en dropdown"
→ Ir a Configuración → Crear servicio primero

### Error: "Turno no se guarda"
→ Ver consola (F12) → Si hay error → Reportar

### Error: "No puedo invitar usuario"
→ Ver si RPC create_invitation existe → Ejecutar SQL

---

## ✅ CHECKLIST FINAL

Si completaste TODO esto sin problemas críticos:

```
🎉 ¡LA APLICACIÓN ESTÁ LISTA PARA PRODUCCIÓN!

✅ Flujo owner: 100% funcional
✅ CRUD: Funciona todo
✅ Calendario: Funciona
✅ Invitaciones: Funcionan
✅ RLS: Protege datos
✅ UX: Fluida
✅ Errores: Manejados
```

---

**Próximo paso:** Cuando termines, reporta los resultados.
