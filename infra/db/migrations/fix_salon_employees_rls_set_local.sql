-- Solución A: Usar SET LOCAL row_security = off en lugar de set_config
-- Esta solución intenta usar SET LOCAL que funciona a nivel de transacción

-- Actualizar función para usar SET LOCAL row_security = off
CREATE OR REPLACE FUNCTION public.can_assign_employee_to_salon(
  p_salon_id uuid,
  p_employee_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_result boolean;
BEGIN
  -- Desactivar RLS temporalmente para esta función usando SET LOCAL
  -- Esto funciona a nivel de transacción en lugar de sesión
  SET LOCAL row_security = off;
  
  -- Verificar que existe una membresía del usuario y que el salón y empleado pertenecen a la misma org
  SELECT EXISTS (
    SELECT 1 
    FROM app.memberships m
    INNER JOIN app.salons s ON s.org_id = m.org_id
    INNER JOIN app.employees e ON e.org_id = m.org_id
    WHERE m.user_id = auth.uid()
    AND s.id = p_salon_id
    AND e.id = p_employee_id
    AND s.org_id = e.org_id
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

