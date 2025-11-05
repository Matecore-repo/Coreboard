# Migración: Actualizar payment_method para incluir 'mercadopago'

## Instrucciones

Ejecuta el siguiente SQL en el editor SQL de Supabase:

```sql
-- Migración: Actualizar constraints de payment_method para incluir 'mercadopago'
-- Esta migración permite usar 'mercadopago' como método de pago

-- ============================================================================
-- 1. ACTUALIZAR CHECK CONSTRAINT EN app.payments
-- ============================================================================
-- Primero eliminar el constraint existente
ALTER TABLE app.payments 
DROP CONSTRAINT IF EXISTS payments_payment_method_check;

-- Crear nuevo constraint que incluye 'mercadopago'
ALTER TABLE app.payments
ADD CONSTRAINT payments_payment_method_check 
CHECK (payment_method IN ('cash', 'card', 'transfer', 'mercadopago', 'other'));

-- ============================================================================
-- 2. ACTUALIZAR CHECK CONSTRAINT EN public.payments (si existe)
-- ============================================================================
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_payment_method_check;

ALTER TABLE public.payments
ADD CONSTRAINT payments_payment_method_check 
CHECK (payment_method IN ('cash', 'card', 'transfer', 'mercadopago', 'other'));

-- ============================================================================
-- 3. ACTUALIZAR TRIGGER PARA MAPEAR payment_method CORRECTAMENTE
-- ============================================================================
CREATE OR REPLACE FUNCTION app.generate_payment_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_appointment_total numeric;
  v_payment_exists boolean;
  v_payment_method text;
BEGIN
  -- Solo generar pago cuando turno se completa y no había estado completado antes
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Verificar si ya existe un pago para este appointment
    SELECT EXISTS(
      SELECT 1 FROM app.payments
      WHERE appointment_id = NEW.id
    ) INTO v_payment_exists;
    
    -- Si no existe pago, crear uno automáticamente
    IF NOT v_payment_exists THEN
      -- Obtener total_amount del appointment
      v_appointment_total := COALESCE(NEW.total_amount, 0);
      
      -- Solo crear pago si hay un monto mayor a cero
      IF v_appointment_total > 0 THEN
        -- Mapear payment_method del appointment al formato de payments
        v_payment_method := COALESCE(NEW.payment_method, 'cash');
        
        -- Validar y mapear el método de pago
        IF v_payment_method NOT IN ('cash', 'card', 'transfer', 'mercadopago', 'other') THEN
          v_payment_method := 'cash';
        END IF;
        
        INSERT INTO app.payments (
          org_id,
          appointment_id,
          amount,
          payment_method,
          processed_at,
          created_by,
          notes
        ) VALUES (
          NEW.org_id,
          NEW.id,
          v_appointment_total,
          v_payment_method,
          NOW(),
          NEW.created_by,
          'Pago automático al completar turno'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
```

## Cambios realizados

1. ✅ Actualizado `schema.sql` para incluir 'mercadopago' en el constraint
2. ✅ Actualizado el trigger `generate_payment_on_complete` en `schema.sql`
3. ✅ Actualizado el tipo `Payment` en `usePayments.ts` para incluir 'mercadopago'
4. ✅ Actualizado el mapeo de métodos de pago en `usePayments.ts`
5. ✅ Actualizado el mapeo de métodos de pago en `OwnerDashboard.tsx` para mostrar "Mercado Pago"
6. ✅ Creada migración SQL en `infra/db/migrations/fix_payment_method_constraints.sql`

## Próximos pasos

1. Ejecutar la migración SQL en Supabase
2. Crear un turno de prueba con método de pago "Mercado Pago"
3. Completar el turno
4. Verificar que se cree el pago automáticamente
5. Verificar que el pago se refleje en Finanzas (Ingresos Totales)

