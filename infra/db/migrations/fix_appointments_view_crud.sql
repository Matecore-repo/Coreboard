-- Migración: Hacer la vista public.appointments actualizable y borrable
-- Agregar reglas INSTEAD para DELETE y UPDATE en la vista

-- ============================================================================
-- 1. HABILITAR DELETE EN LA VISTA
-- ============================================================================
CREATE OR REPLACE RULE appointments_delete AS
  ON DELETE TO public.appointments
  DO INSTEAD
    DELETE FROM app.appointments WHERE id = OLD.id;

-- ============================================================================
-- 2. HABILITAR UPDATE EN LA VISTA
-- ============================================================================
-- Usar una función para manejar el UPDATE correctamente
CREATE OR REPLACE FUNCTION public.update_appointment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app.appointments 
  SET 
    org_id = COALESCE(NEW.org_id, OLD.org_id),
    salon_id = COALESCE(NEW.salon_id, OLD.salon_id),
    service_id = COALESCE(NEW.service_id, OLD.service_id),
    stylist_id = COALESCE(NEW.stylist_id, OLD.stylist_id),
    client_name = COALESCE(NEW.client_name, OLD.client_name),
    client_phone = COALESCE(NEW.client_phone, OLD.client_phone),
    client_email = COALESCE(NEW.client_email, OLD.client_email),
    starts_at = COALESCE(NEW.starts_at, OLD.starts_at),
    status = COALESCE(NEW.status, OLD.status),
    notes = COALESCE(NEW.notes, OLD.notes),
    total_amount = COALESCE(NEW.total_amount, OLD.total_amount),
    created_by = COALESCE(NEW.created_by, OLD.created_by),
    updated_at = now()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en lugar de regla para UPDATE
DROP TRIGGER IF EXISTS appointments_update_trigger ON public.appointments;
CREATE TRIGGER appointments_update_trigger
  INSTEAD OF UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_appointment();

