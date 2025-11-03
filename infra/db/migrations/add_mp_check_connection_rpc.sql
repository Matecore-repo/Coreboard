-- Función RPC para verificar conexión de Mercado Pago
-- Solo retorna si está conectado y el collector_id (sin tokens)
-- La UI puede usar esta función para verificar el estado de conexión

CREATE OR REPLACE FUNCTION check_mp_connection(org_id_param uuid)
RETURNS TABLE (
  connected boolean,
  collector_id bigint,
  scope text,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as connected,
    c.collector_id,
    c.scope,
    c.expires_at,
    c.created_at,
    c.updated_at
  FROM app.mercadopago_credentials c
  WHERE c.org_id = org_id_param
  LIMIT 1;
  
  -- Si no hay resultados, retornar false
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      false as connected,
      NULL::bigint as collector_id,
      NULL::text as scope,
      NULL::timestamptz as expires_at,
      NULL::timestamptz as created_at,
      NULL::timestamptz as updated_at;
  END IF;
END;
$$;

-- Comentario
COMMENT ON FUNCTION check_mp_connection(uuid) IS 
  'Verifica si una organización tiene cuenta de Mercado Pago conectada. Solo retorna información pública (sin tokens).';

-- Permitir que usuarios autenticados llamen esta función
GRANT EXECUTE ON FUNCTION check_mp_connection(uuid) TO authenticated;

