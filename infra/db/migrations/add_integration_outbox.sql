-- Migración: Tabla opcional de outbox para eventos de integración
-- Para orquestar eventos y asegurar reintentos

-- ============================================================================
-- 1. CREAR TABLA app.integration_outbox
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.integration_outbox (
  id bigserial PRIMARY KEY,
  topic text NOT NULL, -- 'payment_approved', 'payment_rejected', etc.
  payload jsonb NOT NULL, -- Datos del evento
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'error', 'cancelled')),
  attempts int NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- ============================================================================
-- 2. ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_integration_outbox_topic ON app.integration_outbox(topic);
CREATE INDEX IF NOT EXISTS idx_integration_outbox_status ON app.integration_outbox(status);
CREATE INDEX IF NOT EXISTS idx_integration_outbox_created_at ON app.integration_outbox(created_at);
CREATE INDEX IF NOT EXISTS idx_integration_outbox_pending ON app.integration_outbox(status, created_at) 
  WHERE status = 'pending';

-- ============================================================================
-- 3. TRIGGER PARA updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_integration_outbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_integration_outbox_updated_at
  BEFORE UPDATE ON app.integration_outbox
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_outbox_updated_at();

-- ============================================================================
-- 4. COMENTARIOS
-- ============================================================================
COMMENT ON TABLE app.integration_outbox IS 'Tabla de eventos para procesamiento asíncrono y reintentos';
COMMENT ON COLUMN app.integration_outbox.topic IS 'Tipo de evento (payment_approved, payment_rejected, etc.)';
COMMENT ON COLUMN app.integration_outbox.payload IS 'Datos del evento en formato JSON';
COMMENT ON COLUMN app.integration_outbox.attempts IS 'Número de intentos de procesamiento';

