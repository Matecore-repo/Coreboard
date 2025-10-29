import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';

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

  const fetchServices = useCallback(async () => {
    if (!enabled || !orgId) {
      setServices([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('org_id', orgId)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, enabled]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const createService = async (serviceData: Omit<Service, 'id'>) => {
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
