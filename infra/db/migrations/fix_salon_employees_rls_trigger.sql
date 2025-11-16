-- Solución D: Trigger BEFORE INSERT para validación
-- Usa un trigger que valida antes de insertar, permitiendo una política INSERT más permisiva

-- Crear función trigger de validación
CREATE OR REPLACE FUNCTION public.validate_salon_employee_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_can_assign boolean;
BEGIN
  -- Desactivar RLS temporalmente para verificar permisos
  SET LOCAL row_security = off;
  
  -- Verificar que existe una membresía del usuario y que el salón y empleado pertenecen a la misma org
  SELECT EXISTS (
    SELECT 1 
    FROM app.memberships m
    INNER JOIN app.salons s ON s.org_id = m.org_id
    INNER JOIN app.employees e ON e.org_id = m.org_id
    WHERE m.user_id = auth.uid()
    AND s.id = NEW.salon_id
    AND e.id = NEW.employee_id
    AND s.org_id = e.org_id
  ) INTO v_can_assign;
  
  IF NOT v_can_assign THEN
    RAISE EXCEPTION 'No se puede asignar el empleado al salón: no tienes permisos o no pertenecen a la misma organización'
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Establecer valores por defecto si no están presentes
  IF NEW.assigned_at IS NULL THEN
    NEW.assigned_at := now();
  END IF;
  
  IF NEW.assigned_by IS NULL THEN
    NEW.assigned_by := auth.uid();
  END IF;
  
  IF NEW.active IS NULL THEN
    NEW.active := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger BEFORE INSERT
DROP TRIGGER IF EXISTS salon_employees_validate_before_insert ON public.salon_employees;

CREATE TRIGGER salon_employees_validate_before_insert
  BEFORE INSERT ON public.salon_employees
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_salon_employee_assignment();

-- Simplificar política INSERT para permitir la validación en el trigger
DROP POLICY IF EXISTS "salon_employees_insert" ON public.salon_employees;

CREATE POLICY "salon_employees_insert" ON public.salon_employees
  FOR INSERT WITH CHECK (
    -- Verificar solo membresía básica, la validación detallada está en el trigger
    EXISTS (
      SELECT 1 FROM app.memberships m
      WHERE m.user_id = auth.uid()
    )
  );

