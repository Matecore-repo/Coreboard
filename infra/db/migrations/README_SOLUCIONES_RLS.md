# Soluciones Alternativas para RLS de salon_employees INSERT

Este documento explica las 6 soluciones alternativas implementadas para resolver el problema de RLS que bloquea los INSERT en `salon_employees`.

## Problema

La política RLS INSERT de `salon_employees` falla con error 403 porque:
- La función SECURITY DEFINER intenta leer `app.salons` y `app.employees`
- Las políticas SELECT de esas tablas se evalúan en el contexto del usuario
- `set_config('row_security', 'off', true)` no funciona en Supabase en este contexto

## Soluciones Disponibles

### Solución A: SET LOCAL row_security = off

**Archivo**: `fix_salon_employees_rls_set_local.sql`

**Enfoque**: Reemplazar `set_config` con `SET LOCAL` que funciona a nivel de transacción.

**Aplicar**:
```bash
# Aplicar migración
supabase migration apply fix_salon_employees_rls_set_local
```

**Ventajas**: Más directo, funciona a nivel de transacción
**Desventajas**: Puede tener las mismas limitaciones en Supabase

---

### Solución B: Política directa sin función helper

**Archivo**: `fix_salon_employees_rls_direct_policy.sql`

**Enfoque**: Eliminar la función helper y usar `auth.org_id()` directamente en la política.

**Aplicar**:
```bash
# Eliminar función helper primero
# Luego aplicar migración
supabase migration apply fix_salon_employees_rls_direct_policy
```

**Ventajas**: Más simple, evita problemas de RLS en funciones
**Desventajas**: Depende de que `auth.org_id()` funcione correctamente

---

### Solución C: Función con INSERT directo (SECURITY DEFINER)

**Archivo**: `fix_salon_employees_rls_function_insert.sql`

**Enfoque**: Crear función que hace el INSERT directamente, evitando la política RLS.

**Aplicar**:
```bash
# Aplicar migración
supabase migration apply fix_salon_employees_rls_function_insert
```

**Cambios en Frontend**: 
- Reemplazar `useSalonEmployees.ts` con `useSalonEmployees.solutionC.ts`
- O modificar el método `assignEmployee` para usar `supabase.rpc('insert_salon_employee', {...})`

**Ventajas**: Control total, evita RLS completamente
**Desventajas**: Requiere cambiar el código frontend

---

### Solución D: Trigger BEFORE INSERT

**Archivo**: `fix_salon_employees_rls_trigger.sql`

**Enfoque**: Usar un trigger que valida antes de insertar, permitiendo una política INSERT más permisiva.

**Aplicar**:
```bash
# Aplicar migración
supabase migration apply fix_salon_employees_rls_trigger
```

**Ventajas**: Validación separada de RLS, más flexible
**Desventajas**: Errores menos claros (RAISE EXCEPTION en lugar de 403)

---

### Solución E: Validación en frontend + política simple

**Archivo**: `fix_salon_employees_rls_simple_policy.sql`

**Enfoque**: Validar permisos en el frontend antes de insertar, usando política RLS simple.

**Aplicar**:
```bash
# Aplicar migración
supabase migration apply fix_salon_employees_rls_simple_policy
```

**Cambios en Frontend**: 
- Reemplazar `useSalonEmployees.ts` con `useSalonEmployees.solutionE.ts`
- O agregar validación en el método `assignEmployee` antes de insertar

**Ventajas**: Más control en frontend, política RLS simple
**Desventajas**: Menos seguro (validación en cliente), requiere lógica adicional

---

### Solución F: Función que retorna datos sin RLS + verificación manual

**Archivo**: `fix_salon_employees_rls_helper_data.sql`

**Enfoque**: Función SECURITY DEFINER que retorna los org_ids necesarios sin pasar por RLS, luego verificar en la política.

**Aplicar**:
```bash
# Aplicar migración
supabase migration apply fix_salon_employees_rls_helper_data
```

**Ventajas**: Separa obtención de datos de validación, más testeable
**Desventajas**: Más complejo, requiere dos pasos

---

## Recomendaciones

### Para desarrollo rápido:
- **Solución B** (Política directa) - Más simple si `auth.org_id()` funciona

### Para producción robusta:
- **Solución C** (Función con INSERT directo) - Evita completamente el problema de RLS

### Si prefieres mantener el frontend simple:
- **Solución D** (Trigger) - Validación en base de datos, frontend no cambia

## Cómo Probar

1. Aplicar una de las migraciones según la solución elegida
2. Si requiere cambios en frontend, aplicar los cambios correspondientes
3. Probar asignación de empleados desde la UI
4. Verificar que no hay errores 403

## Notas Importantes

- Solo aplicar UNA solución a la vez
- Cada solución reemplaza la anterior
- Para revertir, usar la migración original `fix_salon_employees_rls_with_security_definer.sql`
- Las soluciones C y E requieren cambios en el frontend
- Las soluciones A, B, D y F solo requieren cambios en la base de datos

