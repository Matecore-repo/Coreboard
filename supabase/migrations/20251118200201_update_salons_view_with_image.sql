-- Actualizar la vista pública salons para incluir el campo image
CREATE OR REPLACE VIEW public.salons AS 
SELECT 
  id,
  org_id,
  name,
  address,
  phone,
  timezone,
  active,
  created_at,
  updated_at,
  deleted_at,
  rent_price,
  image
FROM app.salons;

