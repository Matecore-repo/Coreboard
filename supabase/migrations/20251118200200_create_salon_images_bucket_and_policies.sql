-- Crear bucket de Storage para imágenes de salones
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'salon-images',
  'salon-images',
  true,
  5242880, -- 5MB
  ARRAY['image/*']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/*'];

-- Política RLS: Permitir lectura pública
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'salon-images');

-- Política RLS: Permitir subida a usuarios autenticados
CREATE POLICY "Authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'salon-images');

-- Política RLS: Permitir actualización a usuarios autenticados
CREATE POLICY "Authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'salon-images')
WITH CHECK (bucket_id = 'salon-images');

-- Política RLS: Permitir eliminación a usuarios autenticados
CREATE POLICY "Authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'salon-images');

