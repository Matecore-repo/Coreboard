import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { demoStore } from '../demo/store';
import { isValidUUID } from '../lib/uuid';
import { queryWithCache, invalidateCache } from '../lib/queryCache';
import { uploadSalonImage, deleteSalonImage } from '../../lib/salonImageUpload';
import { Skeleton } from '../ui/skeleton';

export type UISalon = {
  id: string;
  name: string;
  address: string;
  image: string;
  rentPrice?: number;
  phone?: string;
  email?: string;
  notes?: string;
  openingHours?: string;
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
  rent_price?: number | null;
  image?: string | null; // Agregar campo image
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
    image: s.image || '', // Usar imagen guardada o vacío (no por defecto)
    rentPrice: s.rent_price ?? undefined,
    phone: s.phone ?? undefined,
    services: salonServices,
    staff: [],
  };
}

export function useSalons(orgId?: string, options?: { enabled?: boolean }) {
  const [salons, setSalons] = useState<UISalon[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const enabled = options?.enabled ?? true;
  const { isDemo, currentRole, user } = useAuth();

  const fetchSalons = useCallback(async () => {
    if (!enabled || !orgId) {
      setSalons([]);
      return;
    }
    if (!isDemo && !isValidUUID(orgId)) {
      setSalons([]);
      return;
    }
    
    const cacheKey = `salons:${orgId}`;
    
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

      // Usar caché para evitar consultas duplicadas
      // La clave del caché incluye el rol para que empleados y dueños tengan cachés separados
      const roleCacheKey = `${cacheKey}:${currentRole || 'none'}`;
      
      const mappedSalons = await queryWithCache<UISalon[]>(roleCacheKey, async () => {
        // Si el usuario es empleado, solo obtener salones donde está asignado
        if (currentRole === 'employee' && user?.id) {
          // Primero obtener el employee_id del usuario actual
          const { data: currentEmployee, error: employeeError } = await supabase
            .from('employees')
            .select('id')
            .eq('org_id', orgId)
            .eq('user_id', user.id)
            .eq('active', true)
            .is('deleted_at', null)
            .maybeSingle();

          if (employeeError) {
            throw employeeError as any;
          }

          if (!currentEmployee) {
            // Si no es empleado, no puede ver ningún salón
            return [];
          }

          // Obtener salones donde el empleado está asignado
          const { data: salonEmployeesData, error: salonEmployeesError } = await supabase
            .from('salon_employees')
            .select('salon_id')
            .eq('employee_id', currentEmployee.id)
            .eq('is_active', true);

          if (salonEmployeesError) {
            throw salonEmployeesError as any;
          }

          if (!salonEmployeesData || salonEmployeesData.length === 0) {
            // Si no está asignado a ningún salón, no puede ver ningún salón
            return [];
          }

          const assignedSalonIds = salonEmployeesData.map(se => se.salon_id);

          // Obtener los salones asignados
          const { data: salonsData, error: salonsError } = await supabase
            .from('salons')
            .select('id, org_id, name, address, phone, timezone, active, rent_price, image')
            .eq('org_id', orgId)
            .in('id', assignedSalonIds)
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

          return (salonsData || []).map(s => mapDBToUI(s, (servicesData || []) as DBService[]));
        } else {
          // Si es owner/admin o no tiene rol, obtener todos los salones
          const { data: salonsData, error: salonsError } = await supabase
            .from('salons')
            .select('id, org_id, name, address, phone, timezone, active, rent_price, image')
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

          return (salonsData || []).map(s => mapDBToUI(s, (servicesData || []) as DBService[]));
        }
      });

      setSalons(mappedSalons);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setSalons([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, enabled, isDemo, currentRole, user?.id]);

  useEffect(() => {
    if (enabled && orgId) {
      fetchSalons();
    }
  }, [enabled, orgId, fetchSalons]);

  const createSalon = async (salonData: Omit<DBSalon, 'id'>) => {
    const cacheKey = `salons:${salonData.org_id}`;
    if (isDemo) {
      const created = await demoStore.salons.create({
        org_id: salonData.org_id,
        name: salonData.name,
        address: salonData.address ?? '',
        phone: salonData.phone ?? undefined,
        timezone: salonData.timezone ?? undefined,
        active: salonData.active ?? true,
      });
      invalidateCache(cacheKey);
      await fetchSalons();
      return created;
    }
    const { data, error } = await supabase
      .from('salons')
      .insert([salonData])
      .select()
      .single();

    if (error) throw error;
    invalidateCache(cacheKey);
    await fetchSalons();
    return data;
  };

  const updateSalon = async (id: string, updates: Partial<DBSalon>) => {
    const cacheKey = orgId ? `salons:${orgId}` : null;
    if (isDemo) {
      const sanitized = {
        ...updates,
        address: updates.address ?? undefined,
        phone: updates.phone ?? undefined,
        timezone: updates.timezone ?? undefined,
        active: typeof updates.active === 'boolean' ? updates.active : undefined,
      };
      const updated = await demoStore.salons.update(id, sanitized);
      if (cacheKey) invalidateCache(cacheKey);
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
    if (cacheKey) invalidateCache(cacheKey);
    await fetchSalons();
    return data;
  };

  const deleteSalon = async (id: string) => {
    const cacheKey = orgId ? `salons:${orgId}` : null;
    if (isDemo) {
      await demoStore.salons.remove(id);
      if (cacheKey) invalidateCache(cacheKey);
      await fetchSalons();
      return;
    }
    // Usar soft delete: marcar deleted_at
    const { error } = await supabase
      .from('salons')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    if (cacheKey) invalidateCache(cacheKey);
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
