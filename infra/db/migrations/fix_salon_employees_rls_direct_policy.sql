-- Solución B: Política directa sin función helper
-- Elimina la función helper y usa auth.org_id() directamente en la política

-- Eliminar función helper si existe
DROP FUNCTION IF EXISTS public.can_assign_employee_to_salon(uuid, uuid);

-- Crear política directa que usa auth.org_id()
DROP POLICY IF EXISTS "salon_employees_insert" ON public.salon_employees;

CREATE POLICY "salon_employees_insert" ON public.salon_employees
  FOR INSERT WITH CHECK (
    -- Verificar que el salón pertenece a la org del usuario
    EXISTS (
      SELECT 1 FROM app.salons s
      WHERE s.id = salon_employees.salon_id
      AND s.org_id = auth.org_id()
    )
    -- Verificar que el empleado pertenece a la misma org
    AND EXISTS (
      SELECT 1 FROM app.employees e
      WHERE e.id = salon_employees.employee_id
      AND e.org_id = auth.org_id()
    )
  );

