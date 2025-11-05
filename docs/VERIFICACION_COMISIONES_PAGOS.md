# Verificación: Comisiones y Pagos al Completar Turnos

## Problema Identificado

Al completar un turno, se debe:
1. ✅ **Crear el pago automáticamente** con el `total_amount` del turno
2. ❌ **Crear la comisión automáticamente** para el empleado (stylist)
3. ✅ **Restar la comisión** en los cálculos financieros

## Estado Actual

### ✅ Pago Automático (FUNCIONA)
- **Trigger**: `generate_payment_on_complete_trigger`
- **Función**: `app.generate_payment_on_complete()`
- **Ubicación**: `infra/db/schema.sql` líneas 556-617
- **Funcionalidad**: 
  - Se ejecuta cuando `status = 'completed'`
  - Crea un pago con `amount = total_amount` del appointment
  - Usa el `payment_method` del appointment

### ❌ Comisión Automática (NECESITA CORRECCIÓN)
- **Trigger**: `generate_commission_on_complete_trigger`
- **Función**: `app.generate_commission_on_complete()`
- **Ubicación**: `infra/db/migrations/fix_finances_crud.sql` líneas 106-199
- **Problema**: 
  - El trigger intenta insertar campos que no existen:
    - `appointment_item_id` ❌ (no existe en `app.commissions`)
    - `pct` ❌ (debe ser `commission_pct`)
  - La tabla `app.commissions` usa `commission_pct`, no `pct`

### ✅ Cálculos Financieros (CORRECTO)
- **Ubicación**: `src/hooks/useFinancialMetrics.ts`
- **Cálculo**:
  ```typescript
  // Costos directos: comisiones
  const directCosts = commissions.reduce((sum, comm) => sum + comm.amount, 0);
  
  // Margen bruto: ingreso neto - costos directos
  const grossMargin = netRevenue - directCosts;
  ```
- ✅ **Correcto**: Las comisiones se restan del `netRevenue` para obtener `grossMargin`

## Solución

### 1. Migración SQL Corregida
Se creó `infra/db/migrations/fix_commission_trigger.sql` que:
- ✅ Usa los campos correctos de `app.commissions`:
  - `commission_pct` (no `pct`)
  - No usa `appointment_item_id`
- ✅ Calcula la comisión correctamente:
  - Si `commission_type = 'fixed'`: usa `default_commission_amount`
  - Si `commission_type = 'percentage'` (o NULL): usa `default_commission_pct * total_amount / 100`
- ✅ Asegura que el trigger esté activo

### 2. Campos de la Tabla `app.commissions`
```sql
CREATE TABLE app.commissions (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  appointment_id uuid,
  amount numeric NOT NULL,
  commission_pct numeric NOT NULL,  -- ✅ Campo correcto
  calculated_at timestamptz,
  date date,
  created_at timestamptz
);
```

### 3. Flujo Completo al Completar Turno

1. **Usuario completa turno** → `status = 'completed'`
2. **Trigger `generate_payment_on_complete`**:
   - Crea pago con `amount = total_amount`
   - ✅ **Ingreso sumado correctamente**
3. **Trigger `generate_commission_on_complete`** (después de aplicar migración):
   - Calcula comisión según `commission_type` del empleado
   - Crea registro en `app.commissions`
   - ✅ **Comisión creada automáticamente**
4. **Cálculos Financieros**:
   - `grossRevenue` = suma de `payments.amount` ✅
   - `netRevenue` = `grossRevenue` - descuentos - impuestos ✅
   - `directCosts` = suma de `commissions.amount` ✅
   - `grossMargin` = `netRevenue` - `directCosts` ✅
   - **Comisión restada correctamente**

## Pasos para Aplicar

1. **Ejecutar migración SQL**:
   ```sql
   -- Copiar contenido de infra/db/migrations/fix_commission_trigger.sql
   -- Ejecutar en Supabase SQL Editor
   ```

2. **Verificar trigger activo**:
   ```sql
   SELECT trigger_name, event_manipulation, event_object_table
   FROM information_schema.triggers
   WHERE trigger_name = 'generate_commission_on_complete_trigger';
   ```

3. **Probar flujo completo**:
   - Crear un turno con `total_amount > 0`
   - Asignar un stylist con `default_commission_pct > 0`
   - Completar el turno
   - Verificar que se creó:
     - ✅ Un pago con `amount = total_amount`
     - ✅ Una comisión con `amount = total_amount * commission_pct / 100`
   - Verificar en Finanzas:
     - ✅ Ingresos Totales = suma de pagos
     - ✅ Comisiones = suma de comisiones
     - ✅ Resultado Neto = Ingresos - Gastos - Comisiones

## Resumen

| Aspecto | Estado | Acción |
|---------|--------|--------|
| Crear pago automático | ✅ Funciona | Ninguna |
| Crear comisión automática | ❌ Necesita corrección | Aplicar migración |
| Restar comisión en cálculos | ✅ Correcto | Ninguna |
| Trigger de comisión activo | ❓ Verificar | Aplicar migración |

