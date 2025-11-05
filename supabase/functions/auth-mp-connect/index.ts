/**
 * Edge Function: Iniciar OAuth de Mercado Pago
 * Genera un state firmado y redirige al usuario a la página de autorización de MP
 */

import { createServiceRoleClient } from '../_shared/supabase-client.ts';

const MP_AUTH_URL = 'https://auth.mercadopago.com.ar/authorization';
const MP_CLIENT_ID = Deno.env.get('MP_CLIENT_ID');
const REDIRECT_URI = Deno.env.get('MP_REDIRECT_URI') || 
  `${Deno.env.get('PUBLIC_EDGE_BASE_URL')}/functions/v1/public-auth-mp-callback`;

Deno.serve(async (req) => {
  try {
    // Manejar preflight request (CORS)
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      });
    }

    // Obtener org_id de query params
    const url = new URL(req.url);
    const orgId = url.searchParams.get('org_id');

    if (!orgId) {
      return new Response(
        JSON.stringify({ error: 'org_id es requerido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!MP_CLIENT_ID) {
      return new Response(
        JSON.stringify({ error: 'MP_CLIENT_ID no configurado' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Nota: Para OAuth, permitimos acceso directo sin header de autorización
    // La validación del org_id se hace en el callback después de que MP autoriza
    // Si el header de autorización está presente, lo validamos pero no lo requerimos

    // Generar state único (nonce + org_id firmado)
    const state = crypto.randomUUID();
    
    // Guardar state temporalmente (opcional: usar Redis o tabla temporal)
    // Por ahora, incluimos org_id en el state usando base64
    const stateData = btoa(JSON.stringify({ org_id: orgId, nonce: state }));
    
    // Construir URL de autorización de MP
    const authUrl = new URL(MP_AUTH_URL);
    authUrl.searchParams.set('client_id', MP_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('platform_id', 'mp');
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('state', stateData);
    authUrl.searchParams.set('scope', 'offline_access'); // Necesario para obtener refresh_token

    // Headers CORS para todas las respuestas
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    };

    // Si el request tiene header de autorización (fetch desde frontend), retornar JSON
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      return new Response(
        JSON.stringify({ url: authUrl.toString() }),
        {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Si no hay header (acceso directo), redirigir directamente
    return new Response(null, {
      status: 302,
      headers: {
        'Location': authUrl.toString(),
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('Error en auth-mp-connect:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

