/**
 * Edge Function: Callback de OAuth de Mercado Pago
 * Procesa el código de autorización, intercambia por tokens, cifra y guarda en BD
 */

import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import { encrypt, uint8ArrayToBase64 } from '../_shared/crypto.ts';

const MP_TOKEN_URL = 'https://api.mercadopago.com/oauth/token';
const MP_CLIENT_ID = Deno.env.get('MP_CLIENT_ID');
const MP_CLIENT_SECRET = Deno.env.get('MP_CLIENT_SECRET');
const MP_TOKEN_KEY = Deno.env.get('MP_TOKEN_KEY');
const FRONTEND_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Si hay error, redirigir con mensaje
    if (error) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/dashboard?view=settings&mp_error=${encodeURIComponent(error)}`,
        },
      });
    }

    if (!code || !state) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/dashboard?view=settings&mp_error=missing_params`,
        },
      });
    }

    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET || !MP_TOKEN_KEY) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/dashboard?view=settings&mp_error=config_error`,
        },
      });
    }

    // Decodificar state para obtener org_id
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/dashboard?view=settings&mp_error=invalid_state`,
        },
      });
    }

    const orgId = stateData.org_id;
    if (!orgId) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/dashboard?view=settings&mp_error=missing_org`,
        },
      });
    }

    // Intercambiar code por access_token y refresh_token
    const tokenResponse = await fetch(MP_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        code: code,
        redirect_uri: `${Deno.env.get('PUBLIC_EDGE_BASE_URL')}/functions/v1/auth-mp-callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Error obteniendo tokens de MP:', errorText);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/dashboard?view=settings&mp_error=token_exchange_failed`,
        },
      });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope, user_id } = tokenData;

    if (!access_token || !refresh_token) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/dashboard?view=settings&mp_error=missing_tokens`,
        },
      });
    }

    // Obtener collector_id (user_id es el collector_id)
    const collectorId = user_id || parseInt(user_id);

    // Cifrar tokens
    const accessEncrypted = await encrypt(access_token, MP_TOKEN_KEY);
    const refreshEncrypted = await encrypt(refresh_token, MP_TOKEN_KEY);

    // Calcular fecha de expiración
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null;

    // Guardar en BD (upsert)
    const supabase = createServiceRoleClient();
    const { error: dbError } = await supabase
      .from('mercadopago_credentials')
      .upsert({
        org_id: orgId,
        collector_id: collectorId,
        access_token_ct: uint8ArrayToBase64(accessEncrypted.ciphertext),
        access_token_nonce: uint8ArrayToBase64(accessEncrypted.nonce),
        refresh_token_ct: uint8ArrayToBase64(refreshEncrypted.ciphertext),
        refresh_token_nonce: uint8ArrayToBase64(refreshEncrypted.nonce),
        scope: scope,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'org_id',
      });

    if (dbError) {
      console.error('Error guardando credenciales:', dbError);
      return new Response(null, {
        status: 302,
        headers: {
          'Location': `${FRONTEND_URL}/dashboard?view=settings&mp_error=db_error`,
        },
      });
    }

    // Redirigir a settings con éxito
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${FRONTEND_URL}/dashboard?view=settings&mp=connected`,
      },
    });
  } catch (error) {
    console.error('Error en auth-mp-callback:', error);
    return new Response(null, {
      status: 302,
      headers: {
        'Location': `${FRONTEND_URL}/dashboard?view=settings&mp_error=internal_error`,
      },
    });
  }
});

