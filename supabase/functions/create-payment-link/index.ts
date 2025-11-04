/**
 * Edge Function: Crear payment link
 * Genera un token único y crea un registro en payment_links
 */

import { createServiceRoleClient } from '../_shared/supabase-client.ts';

const FRONTEND_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { org_id, salon_id, title, description, expires_at, metadata } = body;

    if (!org_id || !salon_id) {
      return new Response(
        JSON.stringify({ error: 'org_id y salon_id son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el usuario sea owner/admin de la organización
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generar token único (32 bytes aleatorios)
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');

    // Calcular SHA-256 hash del token
    const tokenData = new TextEncoder().encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Fecha de expiración por defecto: 30 días
    const expiresAt = expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Insertar en payment_links
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('payment_links')
      .insert({
        org_id,
        salon_id,
        token_hash: tokenHash,
        title: title || 'Reserva tu turno',
        description: description || null,
        metadata: metadata || {},
        expires_at: expiresAt,
        active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando payment link:', error);
      return new Response(
        JSON.stringify({ error: 'Error creando payment link', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Retornar token y URL
    return new Response(
      JSON.stringify({
        token,
        url: `${FRONTEND_URL}/book/${token}`,
        expires_at: expiresAt,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en create-payment-link:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
