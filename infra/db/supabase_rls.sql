-- Políticas RLS genéricas para Supabase (admin / owner / employee)
-- Moved to infra/db/ for versioning

-- current_role / current_user_id / current_salon_id based on public.profiles
-- Assumes a table public.profiles with columns: id (auth uid), role text, salon_id text
-- Asegúrate de crear la tabla profiles desde Supabase UI o migrations si prefieres.
-- CREATE TABLE IF NOT EXISTS public.profiles (
--   id uuid PRIMARY KEY,
--   role text,
--   salon_id text
-- );

CREATE OR REPLACE FUNCTION public.current_role() RETURNS text
  LANGUAGE sql STABLE AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid()
  $$;

CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS text
  LANGUAGE sql STABLE AS $$
    SELECT auth.uid()::text
  $$;

CREATE OR REPLACE FUNCTION public.current_salon_id() RETURNS text
  LANGUAGE sql STABLE AS $$
    SELECT salon_id FROM public.profiles WHERE id = auth.uid()
  $$;

-- appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY appointments_admin_full ON public.appointments
  FOR ALL
  USING (public.current_role() = 'admin');

CREATE POLICY appointments_owner_salon ON public.appointments
  FOR ALL
  USING (public.current_role() = 'owner' AND public.current_salon_id() IS NOT NULL AND public.current_salon_id()::text = salon_id::text)
  WITH CHECK (public.current_role() = 'admin' OR (public.current_role() = 'owner' AND public.current_salon_id()::text = salon_id::text));

CREATE POLICY appointments_employee_select ON public.appointments
  FOR SELECT
  USING (public.current_role() = 'employee' AND public.current_salon_id() IS NOT NULL AND public.current_salon_id()::text = salon_id::text);

CREATE POLICY appointments_employee_update_own ON public.appointments
  FOR UPDATE
  USING (public.current_role() = 'employee' AND public.current_salon_id() IS NOT NULL AND public.current_salon_id()::text = salon_id::text AND stylist_id::text = public.current_user_id()::text)
  WITH CHECK (stylist_id::text = public.current_user_id()::text AND public.current_salon_id()::text = salon_id::text);

CREATE POLICY appointments_employee_insert ON public.appointments
  FOR INSERT
  WITH CHECK (public.current_role() = 'admin' OR (public.current_role() = 'employee' AND public.current_salon_id()::text = salon_id::text));

-- clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_admin_full ON public.clients
  FOR ALL
  USING (public.current_role() = 'admin');

CREATE POLICY clients_owner_salon ON public.clients
  FOR ALL
  USING (public.current_role() = 'owner' AND public.current_salon_id() IS NOT NULL AND public.current_salon_id()::text = salon_id::text)
  WITH CHECK (public.current_role() = 'admin' OR (public.current_role() = 'owner' AND public.current_salon_id()::text = salon_id::text));

CREATE POLICY clients_employee_access ON public.clients
  FOR SELECT
  USING (public.current_role() = 'employee' AND public.current_salon_id() IS NOT NULL AND public.current_salon_id()::text = salon_id::text);

CREATE POLICY clients_employee_insert_update ON public.clients
  FOR INSERT, UPDATE
  WITH CHECK (public.current_role() = 'admin' OR (public.current_role() = 'employee' AND public.current_salon_id()::text = salon_id::text));

-- commissions
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY commissions_admin_full ON public.commissions
  FOR ALL
  USING (public.current_role() = 'admin');

CREATE POLICY commissions_owner_salon ON public.commissions
  FOR ALL
  USING (public.current_role() = 'owner' AND public.current_salon_id() IS NOT NULL AND public.current_salon_id()::text = salon_id::text)
  WITH CHECK (public.current_role() = 'admin' OR (public.current_role() = 'owner' AND public.current_salon_id()::text = salon_id::text));

CREATE POLICY commissions_employee_own ON public.commissions
  FOR SELECT
  USING (public.current_role() = 'employee' AND stylist_id::text = public.current_user_id()::text AND public.current_salon_id()::text = salon_id::text);


