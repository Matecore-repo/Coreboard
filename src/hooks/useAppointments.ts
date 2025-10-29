import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { Appointment as GlobalAppointment } from '../types';

export type Appointment = GlobalAppointment;

function mapRowToAppointment(row: any): Appointment {
  return {
    id: String(row.id),
    org_id: String(row.org_id),
    salon_id: String(row.salon_id),
    service_id: String(row.service_id),
    stylist_id: row.stylist_id,
    client_name: row.client_name ?? '',
    client_phone: row.client_phone,
    client_email: row.client_email,
    starts_at: row.starts_at ?? '',
    status: row.status ?? 'pending',
    total_amount: Number(row.total_amount) || 0,
    notes: row.notes,
    created_by: String(row.created_by),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapAppointmentToRow(payload: Partial<Appointment>) {
  return {
    org_id: payload.org_id,
    salon_id: payload.salon_id,
    service_id: payload.service_id,
    stylist_id: payload.stylist_id,
    client_name: payload.client_name,
    client_phone: payload.client_phone,
    client_email: payload.client_email,
    starts_at: payload.starts_at,
    status: payload.status,
    total_amount: payload.total_amount,
    notes: payload.notes,
    created_by: payload.created_by,
  };
}

export function useAppointments(salonId?: string, options?: { enabled?: boolean }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const enabled = options?.enabled ?? true;
  const subscribed = useRef(false);

  const fetchAppointments = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const base = supabase
        .from('appointments')
        .select('id, org_id, salon_id, service_id, stylist_id, client_name, client_phone, client_email, starts_at, status, total_amount, notes, created_by, created_at, updated_at');
            const { data, error } = salonId ? await base.eq('salon_id', salonId).order('starts_at') : await base.order('starts_at');
      if (error) {
        setAppointments([]);
      } else {
        const mapped = ((data as any[]) || []).map(mapRowToAppointment);
        setAppointments(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, [salonId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchAppointments();
    if (subscribed.current) return;
    const subscription = supabase
      .channel('app:appointments')
      .on('postgres_changes', { event: '*', schema: 'app', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .subscribe();
    subscribed.current = true;
    return () => {
      try { subscription.unsubscribe(); } catch {}
      subscribed.current = false;
    };
  }, [fetchAppointments, enabled]);

  const createAppointment = async (payload: Partial<Appointment>) => {
    const toInsert = mapAppointmentToRow(payload);
    const { data, error } = await supabase.from('appointments').insert([toInsert]).select();
    if (error) throw error;
    await fetchAppointments();
    return data;
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const toUpdate = mapAppointmentToRow(updates);
    const { data, error } = await supabase.from('appointments').update(toUpdate).eq('id', id).select();
    if (error) throw error;
    await fetchAppointments();
    return data;
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
    await fetchAppointments();
  };

  return { appointments, loading, fetchAppointments, createAppointment, updateAppointment, deleteAppointment };
}

