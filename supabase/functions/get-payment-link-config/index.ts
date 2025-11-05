/**
 * Edge Function: Obtener configuración de payment link
 * Valida el token y retorna la configuración del link
 */

import { createServiceRoleClient } from '../_shared/supabase-client.ts';

Deno.serve(async (req) => {
  try {
    // Verificar header de autorización (requerido para autenticación con Google)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Autenticación requerida. Por favor inicia sesión con Google.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token es requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Calcular hash del token
    const tokenData = new TextEncoder().encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Buscar en payment_links
    const supabase = createServiceRoleClient();
    const { data: link, error } = await supabase
      .from('payment_links')
      .select(`
        *,
        salon:salons(*),
        org:organizations(*)
      `)
      .eq('token_hash', tokenHash)
      .eq('active', true)
      .single();

    if (error || !link) {
      return new Response(
        JSON.stringify({ error: 'Link no encontrado o inactivo' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar que no haya expirado
    const now = new Date();
    const expiresAt = new Date(link.expires_at);
    if (expiresAt < now) {
      return new Response(
        JSON.stringify({ error: 'Link expirado' }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
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
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en get-payment-link-config:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
