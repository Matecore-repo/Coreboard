-- Migración: Agregar campos a payment_links para configuración del link
-- Permite configurar qué salón, título, descripción y opciones de selección

ALTER TABLE app.payment_links
ADD COLUMN IF NOT EXISTS salon_id uuid REFERENCES app.salons(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- metadata contendrá configuración como:
-- {
--   "allowServiceSelection": true,
--   "allowStylistSelection": true,
--   "preselectedServiceIds": [],
--   "preselectedStylistId": null,
--   "defaultDate": null,
--   "minAdvanceHours": 24
-- }

-- Índice para búsqueda rápida por salon_id
CREATE INDEX IF NOT EXISTS idx_payment_links_salon_id ON app.payment_links(salon_id);

-- Comentarios para documentación
COMMENT ON COLUMN app.payment_links.salon_id IS 'Salón asociado al link de pago';
COMMENT ON COLUMN app.payment_links.title IS 'Título del link de pago (ej: "Reserva tu turno")';
COMMENT ON COLUMN app.payment_links.description IS 'Descripción del link de pago';
COMMENT ON COLUMN app.payment_links.metadata IS 'Configuración adicional del link (opciones de selección, etc)';
