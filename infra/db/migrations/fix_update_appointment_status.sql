-- Fix update_appointment_status function to return correct fields
CREATE OR REPLACE FUNCTION public.update_appointment_status(
  p_appointment_id uuid,
  p_status text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'app', 'public'
AS $$
DECLARE
  v_appointment app.appointments%rowtype;
  v_user_id uuid;
BEGIN
  -- Obtener el user_id actual
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  -- Validar status
  IF p_status NOT IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'Invalid status: %', p_status;
  END IF;
  
  -- Actualizar appointment SOLO si el usuario tiene membresía en la organización del turno
  UPDATE app.appointments
  SET status = p_status,
      updated_at = now()
  WHERE id = p_appointment_id
    AND org_id IN (
      SELECT m.org_id 
      FROM app.memberships m
      WHERE m.user_id = v_user_id
    )
  RETURNING * INTO v_appointment;
  
  -- Verificar que se actualizó
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Appointment not found or access denied';
  END IF;
  
  -- Retornar appointment actualizado con los campos correctos
  RETURN json_build_object(
    'id', v_appointment.id,
    'org_id', v_appointment.org_id,
    'salon_id', v_appointment.salon_id,
    'service_id', v_appointment.service_id,
    'stylist_id', v_appointment.stylist_id,
    'client_name', v_appointment.client_name,
    'client_phone', v_appointment.client_phone,
    'client_email', v_appointment.client_email,
    'status', v_appointment.status::text,
    'total_amount', v_appointment.total_amount,
    'starts_at', v_appointment.starts_at,
    'notes', v_appointment.notes,
    'created_by', v_appointment.created_by,
    'created_at', v_appointment.created_at,
    'updated_at', v_appointment.updated_at
  );
END;
$$;

