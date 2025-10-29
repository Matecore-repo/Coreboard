import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { demoStore } from '../demo/store';
import { isValidUUID } from '../lib/uuid';

export type Organization = {
  id: string;
  name: string;
  tax_id?: string;
  created_at: string;
};

export type Client = {
  id: string;
  org_id: string;
  full_name: string;
  phone?: string;
  email?: string;
  notes?: string;
  marketing_opt_in?: boolean;
  created_at?: string;
};

export const useOrganizations = () => {
  const { user, isDemo } = useAuth();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchOrgs = async () => {
      try {
        setLoading(true);
        if (isDemo) {
          const org = await demoStore.organization.get();
          setOrgs([org]);
          setError(null);
          return;
        }

        // Primero obtener las membresías del usuario
        const { data: memberships, error: membershipsErr } = await supabase
          .from('memberships')
          .select('org_id')
          .eq('user_id', user.id);

        if (membershipsErr) throw membershipsErr;

        if (!memberships || memberships.length === 0) {
          setOrgs([]);
          return;
        }

        // Luego obtener las organizaciones
        const orgIds = memberships.map(m => m.org_id);
        const { data: organizations, error: orgsErr } = await supabase
          .from('orgs')
          .select('id, name, tax_id, created_at')
          .in('id', orgIds);

        if (orgsErr) throw orgsErr;

        setOrgs(organizations || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchOrgs();
  }, [user?.id, isDemo]);

  return { orgs, loading, error };
};

export const useClients = (orgId?: string) => {
  const { currentOrgId, isDemo } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const org_id = orgId || currentOrgId;

  const fetchClients = useCallback(async () => {
    if (!org_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      if (!isDemo && !isValidUUID(org_id)) {
        setClients([]);
        setError(null);
        return;
      }
      if (isDemo) {
        const demoClients = await demoStore.clients.list(org_id);
        setClients(demoClients as Client[]);
        setError(null);
        return;
      }
      const { data, error: err } = await supabase
        .from('clients')
        .select('*')
        .eq('org_id', org_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setClients(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [org_id, isDemo]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClient = async (client: Omit<Client, 'id' | 'created_at'>) => {
    if (!org_id) throw new Error('No organization selected');
    if (!isDemo && !isValidUUID(org_id)) throw new Error('Organización inválida');
    if (isDemo) {
      const created = await demoStore.clients.create(org_id, client);
      await fetchClients();
      return created;
    }

    const { data, error: err } = await supabase
      .from('clients')
      .insert([{ ...client, org_id }])
      .select();

    if (err) throw err;
    await fetchClients();
    return data?.[0];
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    if (!isDemo && !isValidUUID(org_id ?? '')) throw new Error('Organización inválida');
    if (isDemo) {
      const updated = await demoStore.clients.update(id, updates);
      await fetchClients();
      return updated;
    }
    const { data, error: err } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select();

    if (err) throw err;
    await fetchClients();
    return data?.[0];
  };

  const deleteClient = async (id: string) => {
    if (!isDemo && !isValidUUID(org_id ?? '')) throw new Error('Organización inválida');
    if (isDemo) {
      await demoStore.clients.remove(id);
      await fetchClients();
      return;
    }
    const { error: err } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (err) throw err;
    await fetchClients();
  };

  return { clients, loading, error, fetchClients, createClient, updateClient, deleteClient };
};

