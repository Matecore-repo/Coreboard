-- RLS Policies para app.mercadopago_credentials
-- Solo service role puede acceder (Edge Functions)

-- ============================================================================
-- 1. HABILITAR RLS
-- ============================================================================
ALTER TABLE app.mercadopago_credentials ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. POLÍTICAS RLS
-- ============================================================================
-- Solo service role puede leer/escribir
-- La UI nunca debe acceder directamente a los tokens

-- Policy: Service role puede hacer todo
CREATE POLICY "Service role can manage MP credentials"
  ON app.mercadopago_credentials
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 3. COMENTARIOS
-- ============================================================================
COMMENT ON POLICY "Service role can manage MP credentials" ON app.mercadopago_credentials IS 
  'Solo el service role (Edge Functions) puede acceder a las credenciales cifradas. La UI nunca accede directamente.';

