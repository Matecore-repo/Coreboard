import { supabase } from './supabase';

/**
 * Sube una imagen de local a Supabase Storage
 * @param file - Archivo de imagen a subir
 * @param salonId - ID del salón (para crear un nombre único)
 * @param orgId - ID de la organización (para organizar en carpetas)
 * @returns URL pública de la imagen subida
 */
export async function uploadSalonImage(
  file: File,
  salonId: string,
  orgId: string
): Promise<string> {
  // Crear nombre único para el archivo
  const fileExt = file.name.split('.').pop();
  const fileName = `${salonId}-${Date.now()}.${fileExt}`;
  const filePath = `${orgId}/${fileName}`;

  // Subir a Supabase Storage en el bucket 'salon-images'
  const { data, error } = await supabase.storage
    .from('salon-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Error al subir imagen: ${error.message}`);
  }

  // Obtener URL pública
  const { data: { publicUrl } } = supabase.storage
    .from('salon-images')
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Elimina una imagen de Supabase Storage
 * @param imageUrl - URL de la imagen a eliminar
 */
export async function deleteSalonImage(imageUrl: string): Promise<void> {
  try {
    // Extraer el path del archivo de la URL
    // La URL tiene formato: https://[project].supabase.co/storage/v1/object/public/salon-images/orgId/filename
    const urlParts = imageUrl.split('/');
    const filePath = urlParts.slice(-2).join('/'); // orgId/filename

    const { error } = await supabase.storage
      .from('salon-images')
      .remove([filePath]);

    if (error) {
      console.error('Error al eliminar imagen:', error);
      // No lanzar error para no bloquear la eliminación del salón
    }
  } catch (error) {
    console.error('Error al procesar eliminación de imagen:', error);
  }
}
