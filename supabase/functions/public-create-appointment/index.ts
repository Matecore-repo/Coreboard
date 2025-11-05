/**
 * Edge Function: Crear turno desde checkout público
 * Crea el turno, crea la preferencia de MP y retorna init_point
 */

import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import { refreshAccessToken } from '../_shared/mp-token-refresh.ts';

const MP_API_URL = 'https://api.mercadopago.com';
const PUBLIC_EDGE_BASE_URL = Deno.env.get('PUBLIC_EDGE_BASE_URL');
const FRONTEND_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar header de autorización (requerido para autenticación con Google)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Autenticación requerida. Por favor inicia sesión con Google.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      token,
      salon_id,
      service_id,
      stylist_id,
      client_name,
      client_phone,
      client_email,
      starts_at, // ISO string
      amount,
    } = body;

    if (!token || !salon_id || !service_id || !client_name || !starts_at || !amount) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos' }),
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
      .select('org_id, salon_id, active, expires_at')
      .eq('token_hash', tokenHash)
      .eq('active', true)
      .single();

    if (!link || link.salon_id !== salon_id) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const orgId = link.org_id;

    // Obtener servicio para el título
    const { data: salonService } = await supabase
      .from('salon_services')
      .select(`
        services!inner(name)
      `)
      .eq('salon_id', salon_id)
      .eq('service_id', service_id)
      .single();

    const service = salonService ? (Array.isArray(salonService.services) ? salonService.services[0] : salonService.services) : null;
    const serviceName = service?.name || 'Servicio';

    // Crear turno con status='pending'
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .insert({
        org_id: orgId,
        salon_id,
        service_id,
        stylist_id: stylist_id || null,
        client_name,
        client_phone: client_phone || null,
        client_email: client_email || null,
        starts_at,
        status: 'pending',
        total_amount: parseFloat(amount),
        created_by: null, // Turno público
      })
      .select()
      .single();

    if (aptError || !appointment) {
      console.error('Error creando turno:', aptError);
      return new Response(
        JSON.stringify({ error: 'Error creando turno', details: aptError?.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear preferencia de Mercado Pago
    try {
      const accessToken = await refreshAccessToken(orgId);

      const preferenceData = {
        items: [
          {
            title: `${serviceName} - ${client_name}`,
            quantity: 1,
            unit_price: parseFloat(amount),
            currency_id: 'ARS',
          },
        ],
        external_reference: appointment.id,
        metadata: {
          org_id: orgId,
          appointment_id: appointment.id,
          payment_link_token: token,
        },
        back_urls: {
          success: `${FRONTEND_URL}/payment/success?appointment_id=${appointment.id}`,
          failure: `${FRONTEND_URL}/payment/failure?appointment_id=${appointment.id}`,
          pending: `${FRONTEND_URL}/payment/pending?appointment_id=${appointment.id}`,
        },
        auto_return: 'approved',
        notification_url: `${PUBLIC_EDGE_BASE_URL}/functions/v1/mercadopago-webhook`,
      };

      const mpResponse = await fetch(`${MP_API_URL}/checkout/preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': appointment.id,
        },
        body: JSON.stringify(preferenceData),
      });

      if (!mpResponse.ok) {
        const errorText = await mpResponse.text();
        console.error('Error creando preferencia MP:', errorText);
        // Limpiar turno creado
        await supabase.from('appointments').delete().eq('id', appointment.id);
        return new Response(
          JSON.stringify({ error: 'Error creando preferencia de pago', details: errorText }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const preference = await mpResponse.json();

      // Guardar referencia en mp_payments
      await supabase.from('mp_payments').insert({
        org_id: orgId,
        appointment_id: appointment.id,
        mp_payment_id: 0,
        mp_preference_id: preference.id,
        status: 'pending',
        amount: parseFloat(amount),
        currency: 'ARS',
        raw: preference,
      });

      return new Response(
        JSON.stringify({
          appointment_id: appointment.id,
          init_point: preference.init_point,
          sandbox_init_point: preference.sandbox_init_point,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (mpError: any) {
      console.error('Error con Mercado Pago:', mpError);
      // Limpiar turno
      await supabase.from('appointments').delete().eq('id', appointment.id);
      return new Response(
        JSON.stringify({ error: 'Error procesando pago', details: mpError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error en public-create-appointment:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
