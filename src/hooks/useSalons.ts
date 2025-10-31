import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { demoStore } from '../demo/store';
import { isValidUUID } from '../lib/uuid';

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
  const { isDemo } = useAuth();

  const fetchSalons = useCallback(async () => {
    if (!enabled || !orgId) {
      setSalons([]);
      return;
    }
    if (!isDemo && !isValidUUID(orgId)) {
      setSalons([]);
      return;
    }
    try {
      setLoading(true);
      if (isDemo) {
        const [demoSalons, demoServices] = await Promise.all([
          demoStore.salons.list(orgId),
          demoStore.services.list(orgId),
        ]);
        const mappedSalons = demoSalons.map(s => mapDBToUI(s as DBSalon, demoServices as DBService[]));
        setSalons(mappedSalons);
        setError(null);
        return;
      }

      const { data: salonsData, error: salonsError } = await supabase
        .from('salons')
        .select('id, org_id, name, address, phone, timezone, active')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .order('name');

      if (salonsError) {
        throw salonsError as any;
      }

      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, org_id, name, base_price, duration_minutes, active')
        .eq('org_id', orgId)
        .is('deleted_at', null);

      if (servicesError) {
        throw servicesError as any;
      }

      const mappedSalons = (salonsData || []).map(s => mapDBToUI(s, (servicesData || []) as DBService[]));
      setSalons(mappedSalons);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, enabled, isDemo]);

  useEffect(() => {
    if (enabled && orgId) {
      fetchSalons();
    }
  }, [orgId, enabled, isDemo]);

  const createSalon = async (salonData: Omit<DBSalon, 'id'>) => {
    if (isDemo) {
      const created = await demoStore.salons.create({
        org_id: salonData.org_id,
        name: salonData.name,
        address: salonData.address ?? '',
        phone: salonData.phone ?? undefined,
        timezone: salonData.timezone ?? undefined,
        active: salonData.active ?? true,
      });
      await fetchSalons();
      return created;
    }
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
    if (isDemo) {
      const sanitized = {
        ...updates,
        address: updates.address ?? undefined,
        phone: updates.phone ?? undefined,
        timezone: updates.timezone ?? undefined,
        active: typeof updates.active === 'boolean' ? updates.active : undefined,
      };
      const updated = await demoStore.salons.update(id, sanitized);
      await fetchSalons();
      return updated;
    }
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
    if (isDemo) {
      await demoStore.salons.remove(id);
      await fetchSalons();
      return;
    }
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
