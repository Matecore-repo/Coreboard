/**
 * Edge Function: Desconectar cuenta de Mercado Pago
 * Elimina las credenciales de Mercado Pago de una organización
 */

import { createServiceRoleClient } from '../_shared/supabase-client.ts';

Deno.serve(async (req) => {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener datos del request
    const body = await req.json();
    const { org_id } = body;

    if (!org_id) {
      return new Response(
        JSON.stringify({ error: 'org_id es requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el usuario sea owner de la organización
    // Esto debería validarse con el token JWT en producción
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Eliminar credenciales de Mercado Pago
    const supabase = createServiceRoleClient();
    const { error: deleteError } = await supabase
      .from('mercadopago_credentials')
      .delete()
      .eq('org_id', org_id);

    if (deleteError) {
      console.error('Error eliminando credenciales:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Error eliminando credenciales', details: deleteError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en mp-disconnect:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
