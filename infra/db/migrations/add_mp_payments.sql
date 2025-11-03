-- Migración: Tabla de pagos de Mercado Pago
-- Registro de pagos procesados por Mercado Pago

-- ============================================================================
-- 1. CREAR TABLA app.mp_payments
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.mp_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES app.appointments(id) ON DELETE SET NULL,
  mp_payment_id bigint UNIQUE NOT NULL, -- ID del pago en Mercado Pago
  mp_preference_id text NOT NULL, -- ID de la preferencia usada
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'refunded', 'chargeback', 'cancelled')),
  amount numeric(12,2) NOT NULL,
  currency char(3) NOT NULL DEFAULT 'ARS',
  raw jsonb, -- Respuesta completa de MP para debugging
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_mp_payments_org_id ON app.mp_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_mp_payments_appointment_id ON app.mp_payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_mp_payments_mp_payment_id ON app.mp_payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_mp_payments_mp_preference_id ON app.mp_payments(mp_preference_id);
CREATE INDEX IF NOT EXISTS idx_mp_payments_status ON app.mp_payments(status);
CREATE INDEX IF NOT EXISTS idx_mp_payments_created_at ON app.mp_payments(created_at);

-- Índice único para evitar duplicados por org y appointment
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_payments_org_appointment_unique 
  ON app.mp_payments(org_id, appointment_id) 
  WHERE status = 'approved';

-- ============================================================================
-- 3. TRIGGER PARA updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_mp_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mp_payments_updated_at
  BEFORE UPDATE ON app.mp_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_mp_payments_updated_at();

-- ============================================================================
-- 4. COMENTARIOS
-- ============================================================================
COMMENT ON TABLE app.mp_payments IS 'Registro de pagos procesados por Mercado Pago';
COMMENT ON COLUMN app.mp_payments.mp_payment_id IS 'ID único del pago en Mercado Pago';
COMMENT ON COLUMN app.mp_payments.mp_preference_id IS 'ID de la preferencia usada para generar el link de pago';
COMMENT ON COLUMN app.mp_payments.raw IS 'Respuesta completa de MP (JSON) para debugging y auditoría';

