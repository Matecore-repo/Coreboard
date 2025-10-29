-- Production fixes for invitations, organizations, and appointments
-- Run this in Supabase SQL Editor to enable all features

-- 1. ENABLE RLS AND CREATE POLICIES FOR INVITATIONS
ALTER TABLE app.invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "invitations_select" ON app.invitations;
DROP POLICY IF EXISTS "invitations_insert" ON app.invitations;
DROP POLICY IF EXISTS "invitations_update" ON app.invitations;
DROP POLICY IF EXISTS "invitations_delete" ON app.invitations;

-- Create new policies
CREATE POLICY "invitations_select" ON app.invitations
  FOR SELECT USING (organization_id = auth.org_id());

CREATE POLICY "invitations_insert" ON app.invitations
  FOR INSERT WITH CHECK (organization_id = auth.org_id() and created_by = auth.uid());

CREATE POLICY "invitations_update" ON app.invitations
  FOR UPDATE USING (organization_id = auth.org_id());

CREATE POLICY "invitations_delete" ON app.invitations
  FOR DELETE USING (organization_id = auth.org_id());

-- 2. ENSURE CREATE_INVITATION RPC FUNCTION EXISTS
DROP FUNCTION IF EXISTS public.create_invitation(uuid, text, text, text, integer);

CREATE FUNCTION public.create_invitation(
  p_organization_id uuid,
  p_email text default null,
  p_role text default 'employee',
  p_token text default null,
  p_expires_days integer default 7
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  v_token_hash bytea;
  v_expires_at timestamptz;
  v_invitation_id uuid;
  v_token text;
begin
  -- Validate role
  if p_role not in ('owner', 'admin', 'employee', 'viewer') then
    raise exception 'Invalid role: %', p_role;
  end if;

  -- Generate token if not provided
  if p_token is null then
    v_token := encode(gen_random_bytes(32), 'base64url');
  else
    v_token := p_token;
  end if;

  -- Create hash of token
  v_token_hash := digest(v_token, 'sha256');

  -- Calculate expiration
  v_expires_at := now() + interval '1 day' * p_expires_days;

  -- Check if user has permission to create invitations for this org
  if not exists (
    select 1 from app.memberships m
    where m.org_id = p_organization_id
    and m.user_id = auth.uid()
    and m.role in ('owner', 'admin')
  ) then
    raise exception 'Access denied: insufficient permissions';
  end if;

  -- Insert invitation
  insert into app.invitations (
    organization_id,
    email,
    role,
    token_hash,
    expires_at,
    created_by
  ) values (
    p_organization_id,
    p_email,
    p_role,
    v_token_hash,
    v_expires_at,
    auth.uid()
  )
  returning id into v_invitation_id;

  -- Return result
  return json_build_object(
    'id', v_invitation_id,
    'organization_id', p_organization_id,
    'email', p_email,
    'role', p_role,
    'expires_at', v_expires_at,
    'token', v_token
  );
end;
$$;

-- 3. ENSURE PUBLIC VIEWS ARE CORRECT
DROP VIEW IF EXISTS public.invitations CASCADE;
CREATE OR REPLACE VIEW public.invitations AS SELECT * FROM app.invitations;

-- 4. FORCE APPOINTMENTS RLS POLICIES TO BE STRICT
DROP POLICY IF EXISTS "appointments_select" ON app.appointments;
DROP POLICY IF EXISTS "appointments_insert" ON app.appointments;
DROP POLICY IF EXISTS "appointments_update" ON app.appointments;
DROP POLICY IF EXISTS "appointments_delete" ON app.appointments;

CREATE POLICY "appointments_select" ON app.appointments
  FOR SELECT USING (org_id = auth.org_id());

CREATE POLICY "appointments_insert" ON app.appointments
  FOR INSERT WITH CHECK (org_id = auth.org_id() and created_by = auth.uid());

CREATE POLICY "appointments_update" ON app.appointments
  FOR UPDATE USING (org_id = auth.org_id());

CREATE POLICY "appointments_delete" ON app.appointments
  FOR DELETE USING (org_id = auth.org_id());

-- 5. CREATE INDEX FOR INVITATIONS
CREATE INDEX IF NOT EXISTS idx_invitations_org ON app.invitations (organization_id, expires_at) WHERE used_at IS NULL;

-- 6. GRANT PROPER PERMISSIONS
-- Ensure auth schema is accessible
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT SELECT ON auth.users TO authenticated, anon;
