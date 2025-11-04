/**
 * Helper para refrescar access tokens de Mercado Pago
 * Verifica si el token expiró y lo refresca automáticamente si es necesario
 */

import { createServiceRoleClient } from './supabase-client.ts';
import { encrypt, decrypt, uint8ArrayToBase64, base64ToUint8Array } from './crypto.ts';

const MP_TOKEN_URL = 'https://api.mercadopago.com/oauth/token';
const MP_CLIENT_ID = Deno.env.get('MP_CLIENT_ID');
const MP_CLIENT_SECRET = Deno.env.get('MP_CLIENT_SECRET');
const MP_TOKEN_KEY = Deno.env.get('MP_TOKEN_KEY');

/**
 * Refresca el access token de Mercado Pago si ha expirado o está próximo a expirar
 * @param orgId - ID de la organización
 * @returns Access token vigente (ya descifrado)
 */
export async function refreshAccessToken(orgId: string): Promise<string> {
  if (!MP_CLIENT_ID || !MP_CLIENT_SECRET || !MP_TOKEN_KEY) {
    throw new Error('MP_CLIENT_ID, MP_CLIENT_SECRET o MP_TOKEN_KEY no configurados');
  }

  const supabase = createServiceRoleClient();

  // Obtener credenciales de la BD
  const { data: credentials, error: fetchError } = await supabase
    .from('mercadopago_credentials')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (fetchError || !credentials) {
    throw new Error(`No se encontraron credenciales para org_id: ${orgId}`);
  }

  // Verificar si el token expiró (con margen de 5 minutos)
  const now = new Date();
  const expiresAt = credentials.expires_at ? new Date(credentials.expires_at) : null;
  const shouldRefresh = !expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  if (!shouldRefresh) {
    // Token aún válido, descifrar y retornar
    const accessToken = await decrypt(
      base64ToUint8Array(credentials.access_token_ct),
      base64ToUint8Array(credentials.access_token_nonce),
      MP_TOKEN_KEY
    );
    return accessToken;
  }

  // Token expirado o próximo a expirar, refrescar
  if (!credentials.refresh_token_ct || !credentials.refresh_token_nonce) {
    throw new Error('No hay refresh_token disponible. Reconecta Mercado Pago.');
  }

  // Descifrar refresh_token
  const refreshToken = await decrypt(
    base64ToUint8Array(credentials.refresh_token_ct),
    base64ToUint8Array(credentials.refresh_token_nonce),
    MP_TOKEN_KEY
  );

  // Llamar a MP para refrescar
  const tokenResponse = await fetch(MP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Error refrescando token de MP:', errorText);
    throw new Error(`Error refrescando token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  const { access_token, refresh_token: new_refresh_token, expires_in } = tokenData;

  if (!access_token) {
    throw new Error('No se recibió access_token al refrescar');
  }

  // Cifrar nuevos tokens
  const accessEncrypted = await encrypt(access_token, MP_TOKEN_KEY);
  const refreshEncrypted = new_refresh_token
    ? await encrypt(new_refresh_token, MP_TOKEN_KEY)
    : null;

  // Calcular nueva fecha de expiración
  const newExpiresAt = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : null;

  // Actualizar en BD
  const updateData: any = {
    access_token_ct: uint8ArrayToBase64(accessEncrypted.ciphertext),
    access_token_nonce: uint8ArrayToBase64(accessEncrypted.nonce),
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  };

  // Actualizar refresh_token solo si MP devolvió uno nuevo
  if (refreshEncrypted) {
    updateData.refresh_token_ct = uint8ArrayToBase64(refreshEncrypted.ciphertext);
    updateData.refresh_token_nonce = uint8ArrayToBase64(refreshEncrypted.nonce);
  }

  const { error: updateError } = await supabase
    .from('mercadopago_credentials')
    .update(updateData)
    .eq('org_id', orgId);

  if (updateError) {
    console.error('Error actualizando tokens:', updateError);
    throw new Error('Error guardando tokens refrescados');
  }

  return access_token;
}
