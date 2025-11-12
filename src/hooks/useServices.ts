import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { demoStore } from '../demo/store';
import { isValidUUID } from '../lib/uuid';

export type Service = {
  id: string;
  org_id: string;
  name: string;
  base_price: number;
  duration_minutes: number;
  active: boolean;
};

export function useServices(orgId?: string, options?: { enabled?: boolean }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const enabled = options?.enabled ?? true;
  const { isDemo } = useAuth();

  const fetchServices = useCallback(async () => {
    if (!enabled || !orgId) {
      setServices([]);
      return;
    }
    if (!isDemo && !isValidUUID(orgId)) {
      setServices([]);
      return;
    }

    try {
      setLoading(true);
      if (isDemo) {
        const demoServices = await demoStore.services.list(orgId);
        setServices(demoServices as Service[]);
        setError(null);
        return;
      }

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('org_id', orgId)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, enabled, isDemo]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const createService = async (serviceData: Omit<Service, 'id'>) => {
    if (isDemo) {
      const created = await demoStore.services.create(serviceData);
      await fetchServices();
      return created;
    }
    const { data, error } = await supabase
      .from('services')
      .insert([serviceData])
      .select()
      .single();

    if (error) throw error;
    await fetchServices();
    return data;
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    if (isDemo) {
      const updated = await demoStore.services.update(id, updates);
      await fetchServices();
      return updated;
    }
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchServices();
    return data;
  };

  const deleteService = async (id: string) => {
    if (isDemo) {
      await demoStore.services.softDelete(id);
      await fetchServices();
      return;
    }
    const { error } = await supabase
      .from('services')
      .update({ active: false, deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    await fetchServices();
  };

  return {
    services,
    isLoading: loading,
    error,
    createService,
    updateService,
    deleteService,
    refetch: fetchServices
  };
}
