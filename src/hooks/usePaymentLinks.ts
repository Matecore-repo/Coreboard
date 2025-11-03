import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export function usePaymentLinks() {
  const [isLoading, setIsLoading] = useState(false);

  const generatePaymentLink = useCallback(async (orgId: string): Promise<string> => {
    setIsLoading(true);
    try {
      // Generar token único (32 bytes en base64url)
      const token = crypto.getRandomValues(new Uint8Array(32))
        .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
      
      // Calcular hash del token (SHA256)
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Fecha de expiración: 30 días desde ahora
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Insertar payment link en la base de datos
      const { data: paymentLinkData, error } = await supabase
        .from('payment_links')
        .insert({
          org_id: orgId,
          token_hash: tokenHash,
          expires_at: expiresAt,
          active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando payment link:', error);
        throw error;
      }

      // Retornar el token (no el hash) para construir la URL
      return token;
    } catch (error) {
      console.error('Error generando payment link:', error);
      toast.error('Error al generar link de pago');
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

