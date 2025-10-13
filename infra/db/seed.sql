-- Seed para profiles (ejemplos)
-- REEMPLAZA los UUIDs por los auth.uids reales de tu proyecto Supabase

-- Crear tabla si no existe (si no la creaste desde la UI)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  role text CHECK (role IN ('admin','owner','employee','demo')),
  salon_id text
);

-- Inserts de ejemplo (usa los auth.uids reales)
-- Reemplazar '<uuid-admin>' etc. por UID correctos
INSERT INTO public.profiles(id, role, salon_id) VALUES
  ('<uuid-admin>', 'admin', NULL),
  ('<uuid-owner-1>', 'owner', '1'),
  ('<uuid-owner-2>', 'owner', '2'),
  ('<uuid-employee-1>', 'employee', '1'),
  ('<uuid-demo>', 'demo', NULL)
ON CONFLICT (id) DO NOTHING;


