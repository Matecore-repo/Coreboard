// ============================================================================
// HOOK: useInvitations
// ============================================================================
// Hook para gestionar invitaciones por email

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toastSuccess, toastError } from '../lib/toast';

export interface Invitation {
  id: string;
  organization_id: string;
  email: string | null;
  role: 'owner' | 'admin' | 'employee' | 'viewer';
  expires_at: string;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

/**
 * Hook para gestionar invitaciones
 */
export function useInvitations(orgId: string | null) {
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  /**
   * Carga las invitaciones de una organización
   */
  const loadInvitations = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setInvitations(data || []);
    } catch (error: any) {
      console.error('Error cargando invitaciones:', error);
      toastError('Error al cargar invitaciones');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  /**
   * Crea una nueva invitación por email
   */
  const createInvitation = useCallback(async (
    email: string,
    role: 'owner' | 'admin' | 'employee' | 'viewer' = 'employee',
    expiresDays: number = 7
  ): Promise<string | null> => {
    if (!orgId) {
      throw new Error('No hay organización seleccionada');
    }

    setLoading(true);
    try {
      // Generar token seguro (base64url)
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const token = Array.from(array, byte => String.fromCharCode(byte))
        .join('')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      // Llamar a la función RPC existente (genera hash internamente)
      const { data, error } = await supabase.rpc('create_invitation', {
        p_organization_id: orgId,
        p_email: email.toLowerCase().trim(),
        p_role: role,
        p_token: token, // La función RPC genera el hash
        p_expires_days: expiresDays,
      });

      if (error) throw error;

      // Recargar invitaciones
      await loadInvitations();

      // Devolver el token para enviarlo por email (vía n8n)
      // El token viene en data.token de la función RPC
      return data?.token || token;
    } catch (error: any) {
      console.error('Error creando invitación:', error);
      toastError(error.message || 'Error al crear invitación');
      return null;
    } finally {
      setLoading(false);
    }
  }, [orgId, loadInvitations]);

  /**
   * Cancela una invitación (soft delete)
   */
  const cancelInvitation = useCallback(async (invitationId: string) => {
    setLoading(true);
    try {
      // Marcar como usada (efectivamente la cancela)
      const { error } = await supabase
        .from('invitations')
        .update({
          used_at: new Date().toISOString(),
        })
        .eq('id', invitationId);

      if (error) throw error;

      await loadInvitations();
      toastSuccess('Invitación cancelada');
    } catch (error: any) {
      console.error('Error cancelando invitación:', error);
      toastError('Error al cancelar invitación');
    } finally {
      setLoading(false);
    }
  }, [loadInvitations]);

  return {
    invitations,
    loading,
    loadInvitations,
    createInvitation,
    cancelInvitation,
  };
}

