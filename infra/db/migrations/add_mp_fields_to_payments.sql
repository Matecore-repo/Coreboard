-- Migración: Agregar campos de Mercado Pago a tabla app.payments existente
-- Para compatibilidad con el sistema de pagos actual

-- ============================================================================
-- 1. AGREGAR CAMPOS MP A app.payments
-- ============================================================================
ALTER TABLE app.payments
ADD COLUMN IF NOT EXISTS mp_payment_id bigint,
ADD COLUMN IF NOT EXISTS mp_preference_id text,
ADD COLUMN IF NOT EXISTS mp_status text CHECK (mp_status IN ('pending', 'approved', 'rejected', 'refunded', 'chargeback', 'cancelled'));

-- ============================================================================
-- 2. ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON app.payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_preference_id ON app.payments(mp_preference_id);

-- ============================================================================
-- 3. COMENTARIOS
-- ============================================================================
COMMENT ON COLUMN app.payments.mp_payment_id IS 'ID del pago en Mercado Pago (relación con app.mp_payments)';
COMMENT ON COLUMN app.payments.mp_preference_id IS 'ID de la preferencia de Mercado Pago usada';
COMMENT ON COLUMN app.payments.mp_status IS 'Estado del pago según Mercado Pago';

