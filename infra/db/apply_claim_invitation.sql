-- ============================================================================
-- Script para aplicar función RPC claim_invitation en Supabase
-- ============================================================================
-- Ejecutar este script en el SQL Editor de Supabase si la función 
-- claim_invitation no existe o necesita ser actualizada
--
-- Esta función permite a usuarios autenticados reclamar invitaciones
-- usando el token recibido por email.
-- ============================================================================

-- RPC Function for claiming invitations
CREATE OR REPLACE FUNCTION public.claim_invitation(
  p_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_hash bytea;
  v_invitation app.invitations%rowtype;
  v_user_id uuid;
  v_membership_exists boolean;
BEGIN
  -- Verificar que el usuario está autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to claim an invitation';
  END IF;

  -- Crear hash del token para buscar la invitación
  v_token_hash := digest(p_token, 'sha256');

  -- Buscar la invitación por hash del token
  SELECT * INTO v_invitation
  FROM app.invitations
  WHERE token_hash = v_token_hash
    AND used_at IS NULL
    AND expires_at > now();

  -- Si no se encontró la invitación
  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;

  -- Si la invitación tiene email, verificar que coincide con el usuario actual
  IF v_invitation.email IS NOT NULL THEN
    DECLARE
      v_user_email text;
    BEGIN
      SELECT email INTO v_user_email
      FROM auth.users
      WHERE id = v_user_id;

      IF lower(v_user_email) != lower(v_invitation.email) THEN
        RAISE EXCEPTION 'Invitation email does not match user email';
      END IF;
    END;
  END IF;

  -- Verificar si el usuario ya tiene membresía en esta organización
  SELECT EXISTS(
    SELECT 1 FROM app.memberships
    WHERE org_id = v_invitation.organization_id
      AND user_id = v_user_id
  ) INTO v_membership_exists;

  -- Si ya tiene membresía, marcar invitación como usada pero no crear duplicado
  IF v_membership_exists THEN
    UPDATE app.invitations
    SET used_at = now(),
        used_by = v_user_id
    WHERE id = v_invitation.id;

    -- Retornar la información de la organización
    RETURN json_build_object(
      'organization_id', v_invitation.organization_id,
      'role', v_invitation.role,
      'message', 'Already a member of this organization'
    );
  END IF;

  -- Crear la membresía
  INSERT INTO app.memberships (
    org_id,
    user_id,
    role
  ) VALUES (
    v_invitation.organization_id,
    v_user_id,
    v_invitation.role
  );

  -- Marcar la invitación como usada
  UPDATE app.invitations
  SET used_at = now(),
      used_by = v_user_id
  WHERE id = v_invitation.id;

  -- Retornar la información de la organización y rol
  RETURN json_build_object(
    'organization_id', v_invitation.organization_id,
    'role', v_invitation.role,
    'message', 'Invitation claimed successfully'
  );
END;
$$;

-- ============================================================================
-- Verificación: Ver si la función se creó correctamente
-- ============================================================================
-- Puedes ejecutar esto para verificar:
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'claim_invitation';

