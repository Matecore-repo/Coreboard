-- Solución definitiva para RLS de salon_employees INSERT
-- Usa una función SECURITY DEFINER para evitar problemas de evaluación circular de políticas RLS

-- Crear función helper con SECURITY DEFINER que puede leer tablas sin pasar por RLS
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
  -- Desactivar RLS temporalmente para esta función
  -- Esto permite leer las tablas sin pasar por las políticas RLS
  PERFORM set_config('row_security', 'off', true);
  
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

-- Actualizar la política INSERT para usar la función helper
DROP POLICY IF EXISTS "salon_employees_insert" ON public.salon_employees;

CREATE POLICY "salon_employees_insert" ON public.salon_employees
  FOR INSERT WITH CHECK (
    public.can_assign_employee_to_salon(
      salon_employees.salon_id,
      salon_employees.employee_id
    )
  );

