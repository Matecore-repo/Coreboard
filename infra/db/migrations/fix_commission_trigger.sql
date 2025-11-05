-- Migración: Corregir trigger de comisiones para usar campos correctos
-- Esta migración corrige el trigger generate_commission_on_complete para que:
-- 1. Use los campos correctos de la tabla app.commissions (commission_pct en lugar de pct)
-- 2. No use appointment_item_id que no existe en la tabla
-- 3. Asegure que el trigger esté activo

-- ============================================================================
-- 1. VERIFICAR Y CORREGIR ESTRUCTURA DE TABLA commissions
-- ============================================================================
-- Asegurar que la tabla app.commissions tenga los campos necesarios
ALTER TABLE app.commissions
ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES app.appointments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Si existe columna pct, renombrarla a commission_pct (o mantener ambas si es necesario para compatibilidad)
-- Por ahora, asumimos que la tabla usa commission_pct

-- ============================================================================
-- 2. CORREGIR FUNCIÓN generate_commission_on_complete
-- ============================================================================
CREATE OR REPLACE FUNCTION app.generate_commission_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id uuid;
  v_employee_record app.employees%ROWTYPE;
  v_commission_amount numeric;
  v_commission_pct numeric;
  v_appointment_total numeric;
  v_commission_exists boolean;
BEGIN
  -- Solo generar comisión cuando turno se completa y no había estado completado antes
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Verificar si ya existe una comisión para este appointment
    SELECT EXISTS(
      SELECT 1 FROM app.commissions
      WHERE appointment_id = NEW.id
    ) INTO v_commission_exists;
    
    -- Si no existe comisión, crear una automáticamente
    IF NOT v_commission_exists THEN
      -- Obtener el employee_id del appointment (stylist_id)
      v_employee_id := NEW.stylist_id;
      
      -- Si no hay stylist_id, intentar buscar por user_id del creador del appointment
      IF v_employee_id IS NULL THEN
        SELECT id INTO v_employee_id
        FROM app.employees
        WHERE user_id = NEW.created_by
          AND org_id = NEW.org_id
          AND active = true
        LIMIT 1;
      END IF;
      
      -- Si encontramos un empleado, generar la comisión
      IF v_employee_id IS NOT NULL THEN
        -- Obtener datos del empleado
        SELECT * INTO v_employee_record
        FROM app.employees
        WHERE id = v_employee_id;
        
        -- Obtener total del appointment
        v_appointment_total := COALESCE(NEW.total_amount, 0);
        
        -- Solo crear comisión si hay un monto mayor a cero
        IF v_appointment_total > 0 THEN
          -- Calcular comisión según tipo (percentage o fixed)
          IF COALESCE(v_employee_record.commission_type, 'percentage') = 'fixed' THEN
            -- Comisión fija
            v_commission_amount := COALESCE(v_employee_record.default_commission_amount, 0);
            v_commission_pct := 0;
          ELSE
            -- Comisión por porcentaje (por defecto)
            v_commission_pct := COALESCE(v_employee_record.default_commission_pct, 50.0);
            v_commission_amount := (v_appointment_total * v_commission_pct / 100);
          END IF;
          
          -- Solo crear comisión si hay un monto mayor a cero
          IF v_commission_amount > 0 THEN
            INSERT INTO app.commissions (
              org_id,
              employee_id,
              appointment_id,
              amount,
              commission_pct,
              date,
              created_at
            ) VALUES (
              NEW.org_id,
              v_employee_id,
              NEW.id,
              v_commission_amount,
              v_commission_pct,
              CURRENT_DATE,
              NOW()
            );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. CREAR/ACTUALIZAR TRIGGER
-- ============================================================================
DROP TRIGGER IF EXISTS generate_commission_on_complete_trigger ON app.appointments;
CREATE TRIGGER generate_commission_on_complete_trigger
  AFTER UPDATE ON app.appointments
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed'))
  EXECUTE FUNCTION app.generate_commission_on_complete();

-- ============================================================================
-- 4. COMENTARIOS
-- ============================================================================
-- Este trigger se ejecuta automáticamente cuando:
-- 1. Un turno cambia de estado a 'completed'
-- 2. No había estado completado antes
-- 3. El turno tiene un stylist_id asignado
-- 4. El turno tiene un total_amount > 0
--
-- La comisión se calcula según:
-- - commission_type = 'fixed': usa default_commission_amount
-- - commission_type = 'percentage' (o NULL): usa default_commission_pct * total_amount / 100
--
-- El pago se crea automáticamente por el trigger generate_payment_on_complete
-- La comisión se crea automáticamente por este trigger

