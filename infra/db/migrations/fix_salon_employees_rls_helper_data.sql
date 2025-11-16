-- Solución F: Función que retorna datos sin RLS + verificación manual
-- Crea una función helper que retorna los org_ids necesarios sin pasar por RLS
-- Luego la política verifica esos datos

-- Crear función que retorna datos sin RLS
CREATE OR REPLACE FUNCTION public.get_salon_and_employee_org_ids(
  p_salon_id uuid,
  p_employee_id uuid
)
RETURNS TABLE (
  salon_org_id uuid,
  employee_org_id uuid,
  user_org_ids uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, app
AS $$
BEGIN
  -- Desactivar RLS temporalmente para leer las tablas
  SET LOCAL row_security = off;
  
  -- Retornar los org_ids sin pasar por RLS
  RETURN QUERY
  SELECT 
    s.org_id as salon_org_id,
    e.org_id as employee_org_id,
    ARRAY_AGG(m.org_id) FILTER (WHERE m.user_id = auth.uid()) as user_org_ids
  FROM app.salons s
  CROSS JOIN app.employees e
  LEFT JOIN app.memberships m ON m.user_id = auth.uid()
  WHERE s.id = p_salon_id
  AND e.id = p_employee_id
  GROUP BY s.org_id, e.org_id;
END;
$$;

-- Actualizar política INSERT para usar los datos retornados por la función
DROP POLICY IF EXISTS "salon_employees_insert" ON public.salon_employees;

CREATE POLICY "salon_employees_insert" ON public.salon_employees
  FOR INSERT WITH CHECK (
    -- Verificar que los org_ids coinciden y el usuario tiene acceso
    EXISTS (
      SELECT 1 FROM public.get_salon_and_employee_org_ids(
        salon_employees.salon_id,
        salon_employees.employee_id
      ) org_data
      WHERE org_data.salon_org_id = org_data.employee_org_id
      AND org_data.salon_org_id = ANY(org_data.user_org_ids)
    )
  );

