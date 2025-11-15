/**
 * Edge Function: Webhook de Mercado Pago
 * Procesa notificaciones de MP, valida firma, consulta pago y actualiza estado
 * Idempotente por mp_payment_id
 */

import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import { verifyMPSignature } from '../_shared/mp-signature.ts';
import { refreshAccessToken } from '../_shared/mp-token-refresh.ts';

const MP_API_URL = 'https://api.mercadopago.com';
const MP_TOKEN_KEY = Deno.env.get('MP_TOKEN_KEY');
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener firma y body
    const signature = req.headers.get('x-signature') || '';
    const body = await req.text();
    const event = JSON.parse(body);

    // Validar firma (si está configurada)
    if (MP_WEBHOOK_SECRET && signature) {
      const isValid = await verifyMPSignature(signature, body, MP_WEBHOOK_SECRET);
      if (!isValid) {
        console.warn('Firma de webhook inválida:', signature);
        return new Response('Unauthorized', {
          status: 401,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    // Responder rápido (200 OK) para ack
    // Procesar de forma asíncrona
    queueMicrotask(async () => {
      try {
        await processWebhookEvent(event);
      } catch (error) {
        console.error('Error procesando webhook:', error);
        // En producción, podrías usar la tabla outbox para reintentos
      }
    });

    return new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('Error en mercadopago-webhook:', error);
    return new Response('OK', {
      status: 200, // Siempre responder 200 para no bloquear reintentos de MP
      headers: { 'Content-Type': 'text/plain' },
    });
  }
});

/**
 * Procesa el evento del webhook
 */
async function processWebhookEvent(event: any) {
  const supabase = createServiceRoleClient();

  // El tipo de evento puede ser 'payment' o 'merchant_order'
  const type = event.type;
  const dataId = event.data?.id;

  if (type === 'payment' && dataId) {
    // Obtener información del pago desde MP
    // Primero necesitamos obtener el access_token de la org
    // Para esto, necesitamos el external_reference o metadata del pago

    // Consultar pago en MP (requiere access_token)
    // Por ahora, asumimos que el evento trae la información necesaria
    const paymentId = dataId;

    // Buscar el pago en nuestra BD por mp_preference_id o external_reference
    const { data: existingPayment, error: findError } = await supabase
      .from('mp_payments')
      .select('*')
      .eq('mp_payment_id', paymentId)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      // Si no existe, obtener info del pago desde MP
      // Pero necesitamos el access_token de la org
      // Por ahora, usamos el evento directamente
      console.log('Pago no encontrado en BD, procesando evento:', event);
      return;
    }

    // Si ya existe, verificar si necesita actualización (idempotencia)
    if (existingPayment) {
      // Ya procesado, skip
      if (existingPayment.status === 'approved' && event.data?.status === 'approved') {
        return;
      }
    }

    // Obtener información completa del pago desde MP
    // Necesitamos el access_token de la org, que obtenemos del appointment_id
    const appointmentId = event.data?.external_reference || event.data?.metadata?.appointment_id;
    
    if (!appointmentId) {
      console.error('No se encontró appointment_id en el evento');
      return;
    }

    // Obtener org_id desde appointment
    const { data: appointment, error: aptError } = await supabase
      .from('appointments')
      .select('org_id')
      .eq('id', appointmentId)
      .single();

    if (aptError || !appointment) {
      console.error('No se encontró el appointment:', appointmentId);
      return;
    }

    const orgId = appointment.org_id;

    // Obtener access token (se refresca automáticamente si expiró)
    let accessToken: string;
    try {
      accessToken = await refreshAccessToken(orgId);
    } catch (error: any) {
      console.error('Error obteniendo token de MP para org:', orgId, error);
      return;
    }

    // Consultar pago completo desde MP
    const mpPaymentResponse = await fetch(`${MP_API_URL}/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!mpPaymentResponse.ok) {
      console.error('Error consultando pago en MP:', await mpPaymentResponse.text());
      return;
    }

    const mpPayment = await mpPaymentResponse.json();

    // Mapear estado de MP a nuestro estado
    const statusMap: Record<string, string> = {
      'approved': 'approved',
      'pending': 'pending',
      'rejected': 'rejected',
      'refunded': 'refunded',
      'cancelled': 'cancelled',
      'in_process': 'pending',
      'in_mediation': 'pending',
      'charged_back': 'chargeback',
    };

    const status = statusMap[mpPayment.status] || 'pending';

    // Upsert en mp_payments
    const { error: upsertError } = await supabase
      .from('mp_payments')
      .upsert({
        org_id: orgId,
        appointment_id: appointmentId,
        mp_payment_id: parseInt(paymentId),
        mp_preference_id: mpPayment.preference_id || event.data?.preference_id,
        status: status,
        amount: mpPayment.transaction_amount || mpPayment.amount,
        currency: mpPayment.currency_id || 'ARS',
        raw: mpPayment,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'mp_payment_id',
      });

    if (upsertError) {
      console.error('Error guardando pago:', upsertError);
      return;
    }

    // Si el pago fue aprobado, actualizar el appointment y crear payment
    if (status === 'approved') {
      // Actualizar appointment
      await supabase
        .from('appointments')
        .update({
          status: 'confirmed',
          total_collected: mpPayment.transaction_amount || mpPayment.amount,
          payment_method: 'mercadopago',
          updated_at: new Date().toISOString(),
        })
        .eq('id', appointmentId);

      // Crear registro en payments
      await supabase
        .from('payments')
        .insert({
          org_id: orgId,
          appointment_id: appointmentId,
          amount: mpPayment.transaction_amount || mpPayment.amount,
          method: 'mp',
          mp_payment_id: parseInt(paymentId),
          mp_preference_id: mpPayment.preference_id || event.data?.preference_id,
          mp_status: status,
          received_at: mpPayment.date_approved || new Date().toISOString(),
          notes: `Pago aprobado por Mercado Pago - Payment ID: ${paymentId}`,
        })
        .select()
        .single();
    }
  }
}

