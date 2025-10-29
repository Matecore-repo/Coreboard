import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';

export type UISalon = {
  id: string;
  name: string;
  address: string;
  image: string;
  staff?: string[];
  services?: { id: string; name: string; price: number; durationMinutes: number }[];
};

type DBSalon = {
  id: string;
  org_id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  timezone?: string | null;
  active?: boolean | null;
};

type DBService = {
  id: string;
  org_id: string;
  name: string;
  base_price: number;
  duration_minutes: number;
  active: boolean;
};

function mapDBToUI(s: DBSalon, services: DBService[]): UISalon {
  // Filtrar servicios de esta org
  const salonServices = services
    .filter(svc => svc.org_id === s.org_id && svc.active)
    .map(svc => ({
      id: svc.id,
      name: svc.name,
      price: svc.base_price,
      durationMinutes: svc.duration_minutes,
    }));

  return {
    id: String(s.id),
    name: s.name,
    address: s.address || '',
    image: '/imagenlogin.jpg',
    services: salonServices,
    staff: [],
  };
}

export function useSalons(orgId?: string, options?: { enabled?: boolean }) {
  const [salons, setSalons] = useState<UISalon[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const enabled = options?.enabled ?? true;

  const fetchSalons = useCallback(async () => {
    if (!enabled || !orgId) {
      setSalons([]);
      return;
    }
    try {
      setLoading(true);

      // Cargar salones (solo los no eliminados)
      const { data: salonsData, error: salonsError } = await supabase
        .from('salons')
        .select('id, org_id, name, address, phone, timezone, active')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .order('name');

      if (salonsError) throw salonsError as any;

      // Cargar servicios de la org
            const { data: servicesData, error: servicesError } = await supabase
              .from('services')
              .select('id, org_id, name, base_price, duration_minutes, active')
              .eq('org_id', orgId)
              .is('deleted_at', null);

      if (servicesError) throw servicesError as any;

      const mappedSalons = (salonsData || []).map(s =>
        mapDBToUI(s, (servicesData || []) as DBService[])
      );
      setSalons(mappedSalons);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, enabled]);

  useEffect(() => {
    fetchSalons();
  }, [fetchSalons]);

  const createSalon = async (salonData: Omit<DBSalon, 'id'>) => {
    const { data, error } = await supabase
      .from('salons')
      .insert([salonData])
      .select()
      .single();

    if (error) throw error;
    await fetchSalons();
    return data;
  };

  const updateSalon = async (id: string, updates: Partial<DBSalon>) => {
    const { data, error } = await supabase
      .from('salons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchSalons();
    return data;
  };

  const deleteSalon = async (id: string) => {
    // Usar soft delete: marcar deleted_at
    const { error } = await supabase
      .from('salons')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    await fetchSalons();
  };

  return {
    salons,
    isLoading: loading,
    error,
    createSalon,
    updateSalon,
    deleteSalon
  };
}
