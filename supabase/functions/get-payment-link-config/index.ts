/**
 * Edge Function: Obtener configuración de payment link
 * Valida el token y retorna la configuración del link
 */

import { createServiceRoleClient } from '../_shared/supabase-client.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // No requerir autenticación de usuario para validación inicial del token
    // Pero Supabase requiere un header de autorización (anon key es suficiente)
    // La validación del token es suficiente para verificar el link
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token es requerido' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Usar función RPC para buscar payment link por token (maneja bytea correctamente)
    const supabase = createServiceRoleClient();
    const { data: link, error } = await supabase.rpc('get_payment_link_by_token', {
      p_token: token,
    });

    if (error || !link) {
      return new Response(
        JSON.stringify({ error: 'Link no encontrado o inactivo' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Validar que no haya expirado
    const now = new Date();
    const expiresAt = new Date(link.expires_at);
    if (expiresAt < now) {
      return new Response(
        JSON.stringify({ error: 'Link expirado' }),
        { status: 410, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Retornar configuración
    return new Response(
      JSON.stringify({
        id: link.id,
        org_id: link.org_id,
        salon_id: link.salon_id,
        title: link.title,
        description: link.description,
        metadata: link.metadata || {},
        salon: link.salon,
        organization: link.org,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en get-payment-link-config:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
