import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toastSuccess, toastError } from '../lib/toast';
import type { MercadoPagoCredentials } from '../types';

export function useMercadoPago() {
  const { currentOrgId, currentRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [credentials, setCredentials] = useState<MercadoPagoCredentials | null>(null);

  /**
   * Verifica si la organización tiene cuenta de Mercado Pago conectada
   */
  const checkConnection = useCallback(async () => {
    if (!currentOrgId) {
      setIsConnected(false);
      setCredentials(null);
      return;
    }

    try {
      // La UI no puede leer las credenciales directamente (RLS)
      // Usamos una función RPC o verificamos por otro medio
      // Por ahora, verificamos si existe un registro (aunque no podamos leer los tokens)
      
      // Alternativa: crear una función RPC que solo retorne si está conectado
      const { data, error } = await supabase
        .rpc('check_mp_connection', { org_id_param: currentOrgId })
        .single();

      if (error) {
        // Si no existe la función RPC, intentar verificar de otra forma
        // Por ahora, asumimos que no está conectado si hay error
        setIsConnected(false);
        setCredentials(null);
        return;
      }

      const dataAny = data as any;
      setIsConnected(dataAny?.connected || false);
      if (dataAny?.connected) {
        setCredentials({
          org_id: currentOrgId,
          collector_id: dataAny.collector_id || 0,
          scope: dataAny.scope,
          expires_at: dataAny.expires_at,
          created_at: dataAny.created_at || new Date().toISOString(),
          updated_at: dataAny.updated_at || new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error verificando conexión MP:', error);
      setIsConnected(false);
      setCredentials(null);
    }
  }, [currentOrgId]);

  /**
   * Inicia el flujo OAuth de Mercado Pago
   * Redirige al usuario a la página de autorización de MP
   */
  const connectMercadoPago = useCallback(async () => {
    if (!currentOrgId) {
      toastError('No hay organización seleccionada');
      return;
    }

    if (currentRole !== 'owner') {
      toastError('Solo los dueños pueden conectar cuentas de Mercado Pago');
      return;
    }

    try {
      setIsLoading(true);
      
      // Obtener URL de Edge Functions
      const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Hacer fetch a la Edge Function con el token de autorización
      // La función retorna un redirect 302, pero podemos obtener la URL desde los headers
      const response = await fetch(`${functionsUrl}/auth-mp-connect?org_id=${currentOrgId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        redirect: 'manual', // No seguir redirects automáticamente
      });

      // Si la respuesta es un redirect, obtener la URL de Location header
      if (response.status === 302 || response.status === 301 || response.status === 307 || response.status === 308) {
        const location = response.headers.get('Location');
        if (location) {
          window.location.href = location;
          return;
        }
      }

      // Si no hay Location header, intentar leer el body (puede contener la URL)
      const data = await response.json().catch(() => null);
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      // Si todo falla, intentar redirección directa (puede fallar si requiere JWT)
      const connectUrl = `${functionsUrl}/auth-mp-connect?org_id=${currentOrgId}`;
      window.location.href = connectUrl;
    } catch (error: any) {
      console.error('Error conectando Mercado Pago:', error);
      toastError(error.message || 'Error al conectar Mercado Pago');
      setIsLoading(false);
    }
  }, [currentOrgId, currentRole]);

  /**
   * Desconecta la cuenta de Mercado Pago de la organización
   */
  const disconnectMercadoPago = useCallback(async () => {
    if (!currentOrgId) {
      toastError('No hay organización seleccionada');
      return;
    }

    if (currentRole !== 'owner') {
      toastError('Solo los dueños pueden desconectar cuentas de Mercado Pago');
      return;
    }

    try {
      setIsLoading(true);
      
      // Obtener URL de Edge Functions
      const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Llamar a Edge Function para eliminar credenciales
      const response = await fetch(`${functionsUrl}/mp-disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ org_id: currentOrgId }),
      });

      if (!response.ok) {
        throw new Error('Error desconectando Mercado Pago');
      }

      toastSuccess('Cuenta de Mercado Pago desconectada');
      setIsConnected(false);
      setCredentials(null);
    } catch (error: any) {
      console.error('Error desconectando Mercado Pago:', error);
      toastError(error.message || 'Error al desconectar Mercado Pago');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrgId, currentRole]);

  // Verificar conexión al montar y cuando cambie orgId
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    isConnected,
    credentials,
    isLoading,
    connectMercadoPago,
    disconnectMercadoPago,
    checkConnection,
  };
}

