/**
 * Edge Function: Crear preferencia de pago en Mercado Pago
 * Recibe: org_id, appointment_id, title, amount, back_urls
 * Retorna: init_point (URL de checkout)
 */

import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import { decrypt, base64ToUint8Array } from '../_shared/crypto.ts';

const MP_API_URL = 'https://api.mercadopago.com';
const MP_TOKEN_KEY = Deno.env.get('MP_TOKEN_KEY');
const PUBLIC_EDGE_BASE_URL = Deno.env.get('PUBLIC_EDGE_BASE_URL');
const FRONTEND_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';

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
    const { org_id, appointment_id, title, amount, back_urls } = body;

    // Validar campos requeridos
    if (!org_id || !appointment_id || !title || !amount) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: org_id, appointment_id, title, amount' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!MP_TOKEN_KEY) {
      return new Response(
        JSON.stringify({ error: 'MP_TOKEN_KEY no configurado' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener credenciales de la organización
    const supabase = createServiceRoleClient();
    const { data: creds, error: credsError } = await supabase
      .from('mercadopago_credentials')
      .select('*')
      .eq('org_id', org_id)
      .single();

    if (credsError || !creds) {
      return new Response(
        JSON.stringify({ error: 'Organización no tiene cuenta de Mercado Pago conectada' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Descifrar access_token
    const accessTokenCiphertext = base64ToUint8Array(creds.access_token_ct);
    const accessTokenNonce = base64ToUint8Array(creds.access_token_nonce);
    const accessToken = await decrypt(accessTokenCiphertext, accessTokenNonce, MP_TOKEN_KEY);

    // URLs de callback por defecto
    const defaultBackUrls = {
      success: `${FRONTEND_URL}/payment/success?appointment_id=${appointment_id}`,
      failure: `${FRONTEND_URL}/payment/failure?appointment_id=${appointment_id}`,
      pending: `${FRONTEND_URL}/payment/pending?appointment_id=${appointment_id}`,
      ...back_urls,
    };

    // Crear preferencia en Mercado Pago
    const preferenceData = {
      items: [
        {
          title: title,
          quantity: 1,
          unit_price: parseFloat(amount),
          currency_id: 'ARS',
        },
      ],
      external_reference: appointment_id,
      metadata: {
        org_id: org_id,
        appointment_id: appointment_id,
      },
      back_urls: defaultBackUrls,
      auto_return: 'approved',
      notification_url: `${PUBLIC_EDGE_BASE_URL}/functions/v1/mercadopago-webhook`,
    };

    const mpResponse = await fetch(`${MP_API_URL}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': appointment_id, // Evitar duplicados
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('Error creando preferencia en MP:', errorText);
      return new Response(
        JSON.stringify({ error: 'Error creando preferencia en Mercado Pago', details: errorText }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const preference = await mpResponse.json();

    // Guardar referencia en BD (opcional: para tracking)
    await supabase
      .from('mp_payments')
      .insert({
        org_id: org_id,
        appointment_id: appointment_id,
        mp_payment_id: 0, // Se actualizará cuando se procese el webhook
        mp_preference_id: preference.id,
        status: 'pending',
        amount: parseFloat(amount),
        currency: 'ARS',
        raw: preference,
      })
      .select()
      .single();

    // Retornar URL de checkout
    return new Response(
      JSON.stringify({
        url: preference.init_point,
        preference_id: preference.id,
        sandbox_init_point: preference.sandbox_init_point,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error en mp-create-preference:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

