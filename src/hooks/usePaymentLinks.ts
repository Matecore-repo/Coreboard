import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toastError } from '../lib/toast';
import type { MPPreferenceResponse, MPPreferenceRequest } from '../types';

export function usePaymentLinks() {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Genera un link de pago de Mercado Pago llamando a la Edge Function
   * @param orgId - ID de la organización
   * @param appointmentId - ID del turno
   * @param title - Título del servicio
   * @param amount - Monto a cobrar
   * @returns URL del checkout de Mercado Pago
   */
  const generatePaymentLink = useCallback(async (
    orgId: string,
    appointmentId: string,
    title: string,
    amount: number
  ): Promise<string> => {
    setIsLoading(true);
    try {
      // Obtener URL de Edge Functions desde env
      const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Preparar request
      const request: MPPreferenceRequest = {
        org_id: orgId,
        appointment_id: appointmentId,
        title: title,
        amount: amount,
      };

      // Llamar a Edge Function
      const response = await fetch(`${functionsUrl}/mp-create-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorData.error || 'Error creando preferencia de pago');
      }

      const data: MPPreferenceResponse = await response.json();
      
      // Retornar URL del checkout
      return data.url || data.sandbox_init_point || '';
    } catch (error: any) {
      console.error('Error generando payment link:', error);
      toastError(error.message || 'Error al generar link de pago');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPaymentLinkByToken = useCallback(async (token: string) => {
    try {
      // Calcular hash del token
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Buscar payment link por hash
      const { data: paymentLink, error } = await supabase
        .from('payment_links')
        .select('*, org_id, organizations(*)')
        .eq('token_hash', tokenHash)
        .eq('active', true)
        .single();

      if (error) {
        console.error('Error obteniendo payment link:', error);
        return null;
      }

      // Verificar que no esté expirado
      if (new Date(paymentLink.expires_at) < new Date()) {
        return null;
      }

      return paymentLink;
    } catch (error) {
      console.error('Error obteniendo payment link:', error);
      return null;
    }
  }, []);

  return {
    generatePaymentLink,
    getPaymentLinkByToken,
    isLoading,
  };
}

