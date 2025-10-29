import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Appointment as FullAppointment } from '../types';
import { demoStore } from '../demo/store';
import { isValidUUID } from '../lib/uuid';

export interface Appointment {
  id: string;
  clientName: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  stylist: string;
  salonId: string;
}

function mapRowToAppointment(row: any): Appointment {
  const startsAt = row.starts_at ? new Date(row.starts_at) : new Date();
  const date = startsAt.toISOString().split('T')[0];
  const time = startsAt.toTimeString().slice(0, 5);

  return {
    id: row.id,
    clientName: row.client_name || '',
    service: row.service_id || '',
    date,
    time,
    status: row.status || 'pending',
    stylist: row.stylist_id || '',
    salonId: row.salon_id || '',
  };
}

function mapAppointmentToRow(payload: Partial<Appointment>) {
  const startsAt = payload.date && payload.time 
    ? `${payload.date}T${payload.time}:00`
    : undefined;

  return {
    client_name: payload.clientName,
    service_id: payload.service || null,
    starts_at: startsAt,
    status: payload.status,
    stylist_id: payload.stylist || null,
    salon_id: payload.salonId,
    notes: payload.notes,
    created_by: payload.created_by,
  };
}

export function useAppointments(salonId?: string, options?: { enabled?: boolean }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;
  const subscribed = useRef(false);
  const { isDemo, user, currentOrgId } = useAuth() as any;

  const fetchAppointments = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      if (isDemo) {
        const data = await demoStore.appointments.list(salonId);
        setAppointments(data as Appointment[]);
        return;
      }

      if (salonId && !isValidUUID(salonId)) {
        setAppointments([]);
        return;
      }

      const base = supabase
        .from('appointments')
        .select('id, org_id, salon_id, service_id, stylist_id, client_name, client_phone, client_email, starts_at, status, total_amount, notes, created_by, created_at, updated_at');
      const { data, error } = salonId ? await base.eq('salon_id', salonId).order('starts_at') : await base.order('starts_at');
      if (error) {
        console.error('Error fetching appointments:', error);
        setAppointments([]);
      } else {
        const mapped = ((data as any[]) || []).map(mapRowToAppointment);
        setAppointments(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, [salonId, enabled, isDemo]);

  useEffect(() => {
    if (!enabled) return;
    fetchAppointments();
    // Commenting out subscriptions temporarily to avoid infinite loops
    // if (isDemo || subscribed.current) return;
    // const subscription = supabase
    //   .channel('app:appointments')
    //   .on('postgres_changes', { event: '*', schema: 'app', table: 'appointments' }, () => {
    //     fetchAppointments();
    //   })
    //   .subscribe();
    // subscribed.current = true;
    // return () => {
    //   try { subscription.unsubscribe(); } catch {}
    //   subscribed.current = false;
    // };
  }, [fetchAppointments, enabled]);

  const createAppointment = async (appointmentData: Partial<Appointment>) => {
    if (!salonId || (!isDemo && !isValidUUID(salonId))) {
      throw new Error('Salón inválido');
    }
    if (isDemo) {
      const newApt: Appointment = {
        id: Date.now().toString(),
        ...appointmentData as Appointment,
      };
      setAppointments(prev => [newApt, ...prev]);
      return newApt;
    }
    const row = {
      ...mapAppointmentToRow({ ...appointmentData, salonId }),
      org_id: currentOrgId || null,
      created_by: user?.id || null,
    } as any;
    const { data, error } = await supabase
      .from('appointments')
      .insert([row])
      .select()
      .single();

    if (error) throw error;
    await fetchAppointments();
    return mapRowToAppointment(data);
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    if (isDemo) {
      setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt));
      return;
    }
    const row = mapAppointmentToRow(updates);
    const { error } = await supabase
      .from('appointments')
      .update(row)
      .eq('id', id);

    if (error) throw error;
    await fetchAppointments();
  };

  const deleteAppointment = async (id: string) => {
    if (isDemo) {
      setAppointments(prev => prev.filter(apt => apt.id !== id));
      return;
    }
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    await fetchAppointments();
  };

  return {
    appointments,
    isLoading: loading,
    fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  };
}

