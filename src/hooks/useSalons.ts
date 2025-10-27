import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';

export type UISalon = {
  id: string;
  name: string;
  address: string;
  image: string;
  staff?: string[];
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

function mapDBToUI(s: DBSalon): UISalon {
  return {
    id: String(s.id),
    name: s.name,
    address: s.address || '',
    // Fallback a una imagen conocida del proyecto
    image: '/imagenlogin.jpg',
    // services vendrán por separado desde la DB; default vacío
    staff: [],
  };
}

export function useSalons(orgId?: string, options?: { enabled?: boolean }) {
  const [salons, setSalons] = useState<UISalon[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    let active = true;
    const fetchSalons = async () => {
      if (!enabled || !orgId) {
        setSalons([]);
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('salons')
          .select('id, org_id, name, address, phone, timezone, active')
          .eq('org_id', orgId)
          .order('name');
        if (error) throw error as any;
        if (!active) return;
        setSalons((data || []).map(mapDBToUI));
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e : new Error('Unknown error'));
        setSalons([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchSalons();
    return () => {
      active = false;
    };
  }, [orgId, enabled]);

  return { salons, isLoading: loading, error };
}
