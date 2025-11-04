-- ============================================================================
-- Migración: Validar membresía de empleados y crear empleado automáticamente
-- ============================================================================
-- Esta migración:
-- 1. Valida que si un empleado tiene user_id, ese usuario tenga membresía en la misma org
-- 2. Modifica claim_invitation para crear empleado automáticamente al aceptar invitación
-- ============================================================================

-- ============================================================================
-- 1. FUNCIÓN DE VALIDACIÓN: Verificar que empleado con user_id tenga membresía
-- ============================================================================
CREATE OR REPLACE FUNCTION app.validate_employee_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_membership_exists boolean;
BEGIN
  -- Solo validar si el empleado tiene user_id
  IF NEW.user_id IS NOT NULL THEN
    -- Verificar que existe membresía para este user_id en la misma org_id
    SELECT EXISTS(
      SELECT 1 FROM app.memberships
      WHERE user_id = NEW.user_id
        AND org_id = NEW.org_id
    ) INTO v_membership_exists;
    
    -- Si no existe membresía, lanzar error
    IF NOT v_membership_exists THEN
      RAISE EXCEPTION 'Employee with user_id % must have membership in organization %', NEW.user_id, NEW.org_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. TRIGGER: Validar antes de insertar o actualizar empleado
-- ============================================================================
DROP TRIGGER IF EXISTS check_employee_membership_on_insert ON app.employees;
CREATE TRIGGER check_employee_membership_on_insert
  BEFORE INSERT ON app.employees
  FOR EACH ROW
  EXECUTE FUNCTION app.validate_employee_membership();

DROP TRIGGER IF EXISTS check_employee_membership_on_update ON app.employees;
CREATE TRIGGER check_employee_membership_on_update
  BEFORE UPDATE ON app.employees
  FOR EACH ROW
  WHEN (NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.org_id IS DISTINCT FROM OLD.org_id)
  EXECUTE FUNCTION app.validate_employee_membership();

-- ============================================================================
-- 3. FUNCIÓN: Obtener nombre del usuario desde auth.users
-- ============================================================================
CREATE OR REPLACE FUNCTION app.get_user_full_name(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'app', 'public', 'auth'
AS $$
DECLARE
  v_full_name text;
  v_email text;
BEGIN
  -- Intentar obtener full_name del perfil
  SELECT full_name INTO v_full_name
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Si no tiene full_name, usar email
  IF v_full_name IS NULL OR v_full_name = '' THEN
    SELECT email INTO v_email
    FROM auth.users
    WHERE id = p_user_id;
    
    v_full_name := COALESCE(v_email, 'Usuario sin nombre');
  END IF;
  
  RETURN v_full_name;
END;
$$;

-- ============================================================================
-- 4. MODIFICAR claim_invitation: Crear empleado automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_invitation(
  p_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'app', 'public', 'auth'
AS $$
DECLARE
  v_token_hash bytea;
  v_invitation app.invitations%rowtype;
  v_user_id uuid;
  v_membership_exists boolean;
  v_employee_exists boolean;
  v_employee_id uuid;
  v_user_full_name text;
  v_user_email text;
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
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    IF lower(v_user_email) != lower(v_invitation.email) THEN
      RAISE EXCEPTION 'Invitation email does not match user email';
    END IF;
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

  -- ========================================================================
  -- CREAR EMPLEADO AUTOMÁTICAMENTE si el rol es 'employee' o 'admin'
  -- ========================================================================
  IF v_invitation.role IN ('employee', 'admin') THEN
    -- Verificar si ya existe un empleado con este user_id en esta org
    SELECT EXISTS(
      SELECT 1 FROM app.employees
      WHERE user_id = v_user_id
        AND org_id = v_invitation.organization_id
        AND deleted_at IS NULL
    ) INTO v_employee_exists;
    
    -- Si no existe empleado, crear uno nuevo
    IF NOT v_employee_exists THEN
      -- Obtener nombre del usuario
      v_user_full_name := app.get_user_full_name(v_user_id);
      
      -- Obtener email del usuario
      SELECT email INTO v_user_email
      FROM auth.users
      WHERE id = v_user_id;
      
      -- Crear empleado
      INSERT INTO app.employees (
        org_id,
        user_id,
        full_name,
        email,
        role,
        default_commission_pct,
        active
      ) VALUES (
        v_invitation.organization_id,
        v_user_id,
        v_user_full_name,
        v_user_email,
        CASE 
          WHEN v_invitation.role = 'admin' THEN 'admin'
          ELSE 'employee'
        END,
        50.0, -- Porcentaje de comisión por defecto
        true
      ) RETURNING id INTO v_employee_id;
    END IF;
  END IF;

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

