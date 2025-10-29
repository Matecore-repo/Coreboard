# Guía de Testing - COREBOARD Production

## Credenciales
- **Email**: iangel.oned@gmail.com
- **Contraseña**: 123456

---

## Test 1: Login y Acceso Inicial

### Pasos:
1. Ir a http://localhost:3000
2. Ingresar con las credenciales arriba
3. Verificar que carga la vista Home sin errores

### Validaciones:
- ✅ Login exitoso
- ✅ Redirige a Home
- ✅ Sidebar muestra opciones correctas
- ✅ Muestra nombre de usuario/org

---

## Test 2: Gestión de Peluquerías (Salons)

### Paso 2.1: Crear Peluquería
1. Ir a Gestión → Peluquerías
2. Click en "Nueva peluquería"
3. Rellenar:
   - Nombre: "Test Salon 001"
   - Dirección: "Av. Test 123"
   - Teléfono: "+54 11 1234-5678"
   - Otros campos (opcionales)
4. Click "Crear peluquería"

### Validaciones:
- ✅ Peluquería aparece en la lista
- ✅ Se muestra en el carrusel
- ✅ Toast de éxito aparece

### Paso 2.2: Editar Peluquería
1. Seleccionar peluquería recién creada
2. Click "Editar peluquería"
3. Cambiar nombre a "Test Salon 001 - Edited"
4. Click "Guardar cambios"

### Validaciones:
- ✅ Nombre actualizado en la lista
- ✅ Toast de éxito

### Paso 2.3: Eliminar Peluquería
1. Seleccionar peluquería
2. Click "Eliminar"
3. Confirmar en el diálogo

### Validaciones:
- ✅ Peluquería desaparece de la lista
- ✅ Toast de confirmación

---

## Test 3: Gestión de Servicios

### Paso 3.1: Crear Servicio
1. Ir a Gestión → Peluquerías
2. Click en peluquería existente (que no sea la que borraste)
3. Ir a sección "Servicios"
4. Click "Asignar Servicio"
5. Buscar/ver servicios disponibles
6. Click "Asignar" en un servicio

### Validaciones:
- ✅ Servicio aparece en lista de servicios del salón
- ✅ Muestra precio y duración
- ✅ Toast de éxito

### Paso 3.2: Editar Precio de Servicio
1. En servicios del salón, click "Editar" en un servicio
2. Cambiar precio (ej: 500)
3. Cambiar duración (ej: 45)
4. Click "Guardar"

### Validaciones:
- ✅ Override de precio/duración se aplica
- ✅ Muestra los nuevos valores

### Paso 3.3: Remover Servicio
1. Click "Remover" en un servicio
2. Confirmar

### Validaciones:
- ✅ Servicio desaparece de la lista
- ✅ Toast de confirmación

---

## Test 4: Gestión de Empleados

### Paso 4.1: Crear Empleado
1. Ir a Gestión → Personal/Empleados
2. Click "+ Nuevo Empleado"
3. Rellenar:
   - Nombre: "Juan Peluquero"
   - Email: "juan@salon.com"
   - Teléfono: "+54 11 9876-5432"
   - Comisión: 50
4. Click "Crear"

### Validaciones:
- ✅ Empleado aparece en lista
- ✅ Toast de éxito

### Paso 4.2: Asignar Empleado a Salón
1. En vista de Peluquerías, seleccionar un salón
2. Debería haber sección de empleados asignados
3. Si hay botón para asignar, hacerlo

### Validaciones:
- ✅ Empleado aparece como asignado

---

## Test 5: Crear Turno (Appointment)

### Paso 5.1: Crear Turno
1. Ir a Home → Vista de Turnos o click "+ Nuevo Turno"
2. Rellenar:
   - Peluquería: Seleccionar una
   - Servicio: Seleccionar servicio asignado al salón
   - Cliente: Escribir nombre o seleccionar
   - Empleado/Stylist: Seleccionar empleado
   - Fecha: Hoy
   - Hora: Próxima hora completa
3. Click "Crear Turno"

### Validaciones:
- ✅ Turno aparece en calendario
- ✅ Muestra correctamente en fecha/hora
- ✅ Toast de éxito
- ✅ **Sin errores 400 en console**

### Paso 5.2: Ver Turno en Calendario
1. El turno debe aparecer en el calendario
2. Click sobre turno para ver detalles
3. Debería mostrar cliente, servicio, empleado

### Validaciones:
- ✅ Turno visible en calendario
- ✅ Detalles correctos

### Paso 5.3: Editar Turno
1. Hacer click en turno
2. Click "Editar"
3. Cambiar estado a "Confirmado"
4. Click "Guardar"

### Validaciones:
- ✅ Estado se actualiza
- ✅ Turno actualizado en calendario

---

## Test 6: Invitaciones (Crítico)

### Paso 6.1: Crear Invitación
1. Ir a Organización → Invitaciones
2. Click "Invitar Miembro"
3. Rellenar:
   - Email: "nuevo.empleado@test.com"
   - Rol: "employee"
4. Click "Crear Invitación"

### Validaciones:
- ✅ **Se genera un TOKEN** (mostrado en modal verde)
- ✅ Token es copiable al portapapeles
- ✅ **NO hay error 404** en NetworkTab
- ✅ Invitación aparece en lista de "Invitaciones Pendientes"

### Verificación NetworkTab:
1. Abrir DevTools → Network
2. Repetir creación de invitación
3. Buscar request a `/rpc/create_invitation`

### Validaciones:
- ✅ Status Code: **200 OK** (NO 404)
- ✅ Response contiene `token`, `id`, `expires_at`
- ✅ Headers incluyen `Content-Type: application/json`

---

## Test 7: Organización y Memberships

### Paso 7.1: Ver Información de Org
1. Ir a Organización → Info
2. Verificar datos de organización

### Validaciones:
- ✅ Nombre organización visible
- ✅ CUIT/TAX ID si existe

### Paso 7.2: Ver Miembros
1. Click tab "Miembros"
2. Debería listar usuarios con rol

### Validaciones:
- ✅ Tu usuario aparece con rol "owner"
- ✅ Si hay otros, aparecen con sus roles

---

## Test 8: Clientes

### Paso 8.1: Crear Cliente
1. Ir a Gestión → Clientes
2. Click "+ Nuevo Cliente"
3. Rellenar:
   - Nombre: "Cliente Test"
   - Teléfono: "+54 11 5555-1234"
   - Email: "cliente@test.com"
   - Notas: "Cliente VIP"
4. Click "Crear"

### Validaciones:
- ✅ Cliente aparece en lista
- ✅ Toast de éxito

---

## Test 9: Verificar No Hay Errores 404/400

### En Console (F12):
1. Abrir DevTools → Console
2. No debería haber errores rojos de tipo:
   - `Failed to load resource: the server responded with a status of 404`
   - `Failed to load resource: the server responded with a status of 400`

### En Network Tab:
1. Filtrar por Status 400+ 
2. NO debería haber requests fallidas a:
   - `/organizations` - ✅ Ahora es `/orgs`
   - `/appointments` - ✅ Debería funcionar con vista compatible
   - `/rpc/create_invitation` - ✅ Debería ser 200

---

## Test 10: Empty States (Producción)

### Paso 10.1: Verificar sin datos mockup
1. Asegurar que `NEXT_PUBLIC_DEMO_MODE=false` en `.env.local`
2. Navegar a cada sección
3. Si no hay datos, debería mostrar:
   - Empty State con icono
   - Mensaje describiendo qué hacer
   - Botón "Crear primero..."

### Validaciones:
- ✅ EmptyStateSalons: "No hay peluquerías configuradas"
- ✅ EmptyStateServices: "No hay servicios"
- ✅ EmptyStateClients: "No hay clientes"
- ✅ EmptyStateEmployees: "No hay empleados"

---

## Problemas Comunes y Soluciones

### ❌ Error 404 en Organizations
- **Causa**: Código usa `organizations` pero BD tiene `orgs`
- **Solución**: ✅ Ya corregido - código ahora usa `/orgs`

### ❌ Error 400 en Appointments
- **Causa**: Columnas faltantes en SELECT
- **Solución**: ✅ Ya corregido - vista compatible creada con trigger

### ❌ Error "Cannot access selectedSalon before initialization"
- **Causa**: Hook `useSalonServices` antes de declarar estado
- **Solución**: ✅ Ya corregido - reordenado en SalonsManagementView

### ❌ Invitación no funciona (404)
- **Causa**: RPC no existe o mal configurada
- **Solución**: ✅ Ya creada con seguridad definer

---

## Checklist Final

- [ ] Build compila sin errores
- [ ] Login funciona
- [ ] Crear/editar/borrar peluquerías
- [ ] Asignar/editar/remover servicios
- [ ] Crear empleados
- [ ] Crear turno (sin errores 400)
- [ ] Crear invitación (sin errores 404)
- [ ] Ver turno en calendario
- [ ] No hay errores rojos en console
- [ ] Empty states se muestran correctamente
- [ ] `NEXT_PUBLIC_DEMO_MODE=false`

---

## Contacto de Soporte

Si encuentras un error durante testing:
1. Abre DevTools (F12)
2. Toma screenshot del error
3. Anota los pasos para reproducir
4. Incluye el status code si es un error de red
