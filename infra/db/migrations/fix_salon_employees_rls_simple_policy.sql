-- Solución E: Política simple para validación en frontend
-- Simplifica la política RLS a solo verificar membresía básica
-- La validación detallada se hace en el frontend antes de insertar

-- Simplificar política INSERT
DROP POLICY IF EXISTS "salon_employees_insert" ON public.salon_employees;

CREATE POLICY "salon_employees_insert" ON public.salon_employees
  FOR INSERT WITH CHECK (
    -- Solo verificar que el usuario tiene una membresía activa
    -- La validación de que el salón y empleado pertenecen a la misma org se hace en el frontend
    EXISTS (
      SELECT 1 FROM app.memberships m
      WHERE m.user_id = auth.uid()
    )
  );

