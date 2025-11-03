-- RLS Policies para app.mp_payments
-- Owners pueden leer, service role puede insertar/actualizar

-- ============================================================================
-- 1. HABILITAR RLS
-- ============================================================================
ALTER TABLE app.mp_payments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. POLÍTICAS RLS
-- ============================================================================

-- Policy: Owners pueden leer pagos de su organización
CREATE POLICY "Owners can view MP payments of their organization"
  ON app.mp_payments
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM app.memberships
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Policy: Service role puede insertar pagos
CREATE POLICY "Service role can insert MP payments"
  ON app.mp_payments
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Policy: Service role puede actualizar pagos
CREATE POLICY "Service role can update MP payments"
  ON app.mp_payments
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 3. COMENTARIOS
-- ============================================================================
COMMENT ON POLICY "Owners can view MP payments of their organization" ON app.mp_payments IS 
  'Solo los owners pueden ver los pagos de su organización';
COMMENT ON POLICY "Service role can insert MP payments" ON app.mp_payments IS 
  'Edge Functions pueden insertar pagos cuando se procesan webhooks';
COMMENT ON POLICY "Service role can update MP payments" ON app.mp_payments IS 
  'Edge Functions pueden actualizar el estado de los pagos';

