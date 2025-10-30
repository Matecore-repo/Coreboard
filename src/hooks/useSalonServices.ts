import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { demoStore } from '../demo/store';
import { isValidUUID } from '../lib/uuid';

export type SalonService = {
  id: string;
  salon_id: string;
  service_id: string;
  service_name: string;
  base_price: number;
  duration_minutes: number;
  price_override?: number;
  duration_override?: number;
  active: boolean;
};

export function useSalonServices(salonId?: string, options?: { enabled?: boolean }) {
  const [services, setServices] = useState<SalonService[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const enabled = options?.enabled ?? true;
  const subscribed = useRef(false);
  const { isDemo } = useAuth();

  const fetchServices = useCallback(async () => {
    if (!enabled || !salonId) {
      setServices([]);
      return;
    }
    if (!isDemo && !isValidUUID(salonId)) {
      setServices([]);
      return;
    }
    setLoading(true);
    try {
      if (isDemo) {
        const mapped = await demoStore.salonServices.listBySalon(salonId);
        setServices(mapped as SalonService[]);
        setError(null);
        return;
      }

      const { data, error } = await supabase
        .from('salon_services')
        .select(`
          id,
          salon_id,
          service_id,
          price_override,
          duration_override,
          active,
          services!inner (
            name,
            base_price,
            duration_minutes
          )
        `)
        .eq('salon_id', salonId)
        .eq('active', true);

      if (error) throw error;

      const mappedServices = (data || []).map((item: any) => ({
        id: item.id,
        salon_id: item.salon_id,
        service_id: item.service_id,
        service_name: item.services.name,
        base_price: item.services.base_price,
        duration_minutes: item.services.duration_minutes,
        price_override: item.price_override,
        duration_override: item.duration_override,
        active: item.active,
      }));

      setServices(mappedServices);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, [salonId, enabled, isDemo]);

  useEffect(() => {
    if (!enabled || !salonId) return;
    fetchServices();
    
    // Deshabilitado en producción para mejor performance
    // Las subscriptions causan re-renders constantes
    /*
    if (isDemo || subscribed.current || !salonId) return;
    const subscription = supabase
      .channel(`app:salon_services:salon_id=eq.${salonId}`)
      .on('postgres_changes', { event: '*', schema: 'app', table: 'salon_services', filter: `salon_id=eq.${salonId}` }, () => {
        fetchServices();
      })
      .subscribe();
    subscribed.current = true;
    return () => {
      try { subscription.unsubscribe(); } catch {}
      subscribed.current = false;
    };
    */
  }, [fetchServices, salonId, enabled, isDemo]);

  const assignService = async (serviceId: string, priceOverride?: number, durationOverride?: number) => {
    if (!salonId) throw new Error('Salon ID is required');
    if (isDemo) {
      const created = await demoStore.salonServices.assign({ salon_id: salonId, service_id: serviceId, price_override: priceOverride, duration_override: durationOverride });
      await fetchServices();
      return created;
    }
    const { data, error } = await supabase
      .from('salon_services')
      .insert([{
        salon_id: salonId,
        service_id: serviceId,
        price_override: priceOverride,
        duration_override: durationOverride,
        active: true
      }])
      .select()
      .single();

    if (error) throw error;
    await fetchServices();
    return data;
  };

  const updateServiceAssignment = async (assignmentId: string, updates: { price_override?: number; duration_override?: number }) => {
    if (isDemo) {
      const updated = await demoStore.salonServices.update(assignmentId, updates);
      await fetchServices();
      return updated;
    }
    const { data, error } = await supabase
      .from('salon_services')
      .update(updates)
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) throw error;
    await fetchServices();
    return data;
  };

  const unassignService = async (assignmentId: string) => {
    if (isDemo) {
      await demoStore.salonServices.unassign(assignmentId);
      await fetchServices();
      return;
    }
    const { error } = await supabase
      .from('salon_services')
      .update({ active: false })
      .eq('id', assignmentId);

    if (error) throw error;
    await fetchServices();
  };

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
    assignService,
    updateServiceAssignment,
    unassignService
  };
}
