# Guía E2E Testing - COREBOARD

## Descripción General

Suite automatizada de E2E testing con Playwright que valida el flujo completo de un propietario (owner) incluyendo:

- Autenticación
- CRUD de peluquerías
- Asignación de servicios
- Gestión de empleados
- Gestión de clientes
- Creación de turnos
- Invitaciones de usuarios
- Gestión de organización y miembros
- Validación de RLS

## Precondiciones

1. **Entorno configurado:**
   ```bash
   npm install
   npm run build
   ```

2. **Variables de entorno (.env.local):**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://hawpywnmkatwlcbtffrg.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_DEMO_MODE=false
   ```

3. **Credenciales de prueba:**
   - Email: `iangel.oned@gmail.com`
   - Contraseña: `123456`
   - Rol: Owner

## Ejecutar E2E Tests

### Opción 1: CLI Headless (CI/CD)
```bash
npm run e2e
```
Ejecuta todos los tests en paralelo, genera reporte HTML en `playwright-report/`.

### Opción 2: UI Interactivo (Desarrollo)
```bash
npm run e2e:ui
```
Abre navegador con interfaz interactiva para ver tests ejecutándose en tiempo real.

### Opción 3: Debug Mode
```bash
npm run e2e:debug
```
Pausa en breakpoints para inspeccionar paso a paso.

### Ver Reporte HTML
```bash
npm run e2e:report
```

## Estructura de Tests

### `e2e/01-auth.spec.ts`
- Login exitoso
- Logout
- Persistencia de sesión

### `e2e/02-salons-crud.spec.ts`
- Crear peluquería
- Editar peluquería
- Borrar peluquería

### `e2e/03-services-crud.spec.ts`
- Asignar servicio a peluquería
- Editar override de precio/duración
- Remover servicio

### `e2e/full-owner-flow.spec.ts` (PRINCIPAL)
Suite completa con 10 escenarios:
1. Login y acceso a home
2. Crear peluquería
3. Asignar servicios
4. Crear empleado
5. Crear cliente
6. Crear turno
7. Ver turno en calendario
8. Crear invitación
9. Ver organización y miembros
10. Validar sin errores críticos

## Flujo Esperado

```
Login → Home
  ↓
Gestión → Peluquerías
  ├─ Crear peluquería nueva
  ├─ Asignar servicios
  ├─ Personal → Crear empleado
  └─ Clientes → Crear cliente
  ↓
Inicio → Crear turno en calendario
  ↓
Organización → Invitar miembro
  ↓
Validar datos en BD sin errores
```

## Resultados Esperados

✅ **PASS:**
- Login sin 404 en `/auth`
- CRUD operaciones funcionan
- Turnos visibles en calendario
- Invitaciones generan token válido
- RLS permite operaciones correctas
- Sin errores críticos en consola

❌ **FAIL:**
- Errores 404 en endpoints
- UI freezes/timeouts
- Toast errors en operaciones
- RLS denial sin motivo
- Errores "cannot access before initialization"

## Limpieza Post-Test

Los tests crean datos con timestamp (`E2E Salon 1725016365123`) para evitar conflictos. Se limpian automáticamente entre ejecuciones.

Para limpieza manual:
```sql
DELETE FROM app.salons WHERE name LIKE 'E2E Salon %';
DELETE FROM app.employees WHERE full_name LIKE 'E2E Employee %';
DELETE FROM app.clients WHERE full_name LIKE 'E2E Client %';
DELETE FROM app.invitations WHERE email LIKE 'new%@test.local';
```

## Troubleshooting

### Test timeout
```
Error: Timeout waiting for selector 'text=...'
```
**Solución:** Aumentar `waitForLoadState('networkidle')` o revisar selector en DevTools.

### Port en uso
```
Error: Port 3000 already in use
```
**Solución:**
```bash
npm run kill-port 3000  # Windows PowerShell
```

### Auth falla
- Verificar credenciales en BD
- Revisar que `NEXT_PUBLIC_DEMO_MODE=false`
- Limpiar cookies del navegador

### Elementos no encontrados
- Aumentar timeouts en selectors
- Usar `isVisible().catch(() => false)` para flexibilidad
- Verificar que los labels en UI coincidan

## Integración CI/CD

Para GitHub Actions:
```yaml
- name: Run E2E tests
  run: npm run e2e
  
- name: Upload report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 7
```

## Notas

- Tests son **independientes** pero **secuencial** (single worker) para evitar contención de datos
- Cada test hace login propio para aislamiento
- Playwright reutiliza servidor Next.js existente (`reuseExistingServer: true` en dev)
- Screenshots/videos se guardan en `test-results/` solo si fallan
- Traces están activados para debug

## Próximos Pasos

1. Ejecutar: `npm run e2e`
2. Ver reporte: `npm run e2e:report`
3. En CI, agregar trigger en PRs
4. Expandir tests para RLS (admin/employee/viewer roles)
5. Agregar tests de error scenarios (validación, campos requeridos)
