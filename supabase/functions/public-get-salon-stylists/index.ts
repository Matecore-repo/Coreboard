/**
 * Edge Function: Obtener estilistas del salón (público)
 * Retorna empleados activos asignados al salón validando el payment_link_token
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
    const salonId = url.searchParams.get('salon_id');
    const token = url.searchParams.get('token');

    if (!salonId || !token) {
      return new Response(
        JSON.stringify({ error: 'salon_id y token son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar token
    const tokenData = new TextEncoder().encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const supabase = createServiceRoleClient();
    const { data: link } = await supabase
      .from('payment_links')
      .select('salon_id, active, expires_at')
      .eq('token_hash', tokenHash)
      .eq('active', true)
      .single();

    if (!link || link.salon_id !== salonId) {
      return new Response(
        JSON.stringify({ error: 'Token inválido o no autorizado para este salón' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const expiresAt = new Date(link.expires_at);
    if (expiresAt < now) {
      return new Response(
        JSON.stringify({ error: 'Link expirado' }),
        { status: 410, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener empleados asignados al salón
    const { data: salonEmployees, error } = await supabase
      .from('salon_employees')
      .select(`
        *,
        employees!inner(*)
      `)
      .eq('salon_id', salonId)
      .eq('active', true)
      .eq('employees.active', true)
      .is('employees.deleted_at', null);

    if (error) {
      console.error('Error obteniendo estilistas:', error);
      return new Response(
        JSON.stringify({ error: 'Error obteniendo estilistas', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mapear resultados
    const stylists = (salonEmployees || []).map((item: any) => {
      const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees;
      return {
        id: employee.id,
        full_name: employee.full_name,
        email: employee.email,
      };
    });

    return new Response(
      JSON.stringify({ stylists }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en public-get-salon-stylists:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
