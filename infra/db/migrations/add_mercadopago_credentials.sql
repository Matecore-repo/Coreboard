-- Migración: Tabla de credenciales de Mercado Pago
-- Almacena tokens de acceso/refresh cifrados por organización
-- Solo accesible por service role (Edge Functions)

-- ============================================================================
-- 1. CREAR TABLA app.mercadopago_credentials
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.mercadopago_credentials (
  org_id uuid PRIMARY KEY REFERENCES app.organizations(id) ON DELETE CASCADE,
  collector_id bigint NOT NULL,
  access_token_ct bytea NOT NULL, -- Ciphertext del access_token
  access_token_nonce bytea NOT NULL, -- Nonce para AES-GCM
  refresh_token_ct bytea NOT NULL, -- Ciphertext del refresh_token
  refresh_token_nonce bytea NOT NULL, -- Nonce para AES-GCM
  scope text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_mp_credentials_org_id ON app.mercadopago_credentials(org_id);
CREATE INDEX IF NOT EXISTS idx_mp_credentials_collector_id ON app.mercadopago_credentials(collector_id);

-- ============================================================================
-- 3. TRIGGER PARA updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_mp_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mp_credentials_updated_at
  BEFORE UPDATE ON app.mercadopago_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_mp_credentials_updated_at();

-- ============================================================================
-- 4. COMENTARIOS
-- ============================================================================
COMMENT ON TABLE app.mercadopago_credentials IS 'Credenciales cifradas de Mercado Pago por organización. Solo accesible por service role.';
COMMENT ON COLUMN app.mercadopago_credentials.access_token_ct IS 'Access token cifrado con AES-GCM';
COMMENT ON COLUMN app.mercadopago_credentials.access_token_nonce IS 'Nonce para descifrar access_token';
COMMENT ON COLUMN app.mercadopago_credentials.refresh_token_ct IS 'Refresh token cifrado con AES-GCM';
COMMENT ON COLUMN app.mercadopago_credentials.refresh_token_nonce IS 'Nonce para descifrar refresh_token';
COMMENT ON COLUMN app.mercadopago_credentials.collector_id IS 'ID del vendedor (cuenta receptora) en Mercado Pago';

