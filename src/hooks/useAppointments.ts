import { useEffect, useState, useCallback } from 'react';
import supabase from '../lib/supabase';

export type Appointment = {
  id: string;
  clientName: string;
  service: string;
  date: string;
  time: string;
  status: string;
  stylist?: string;
  salonId?: string;
};

function mapRowToAppointment(row: any): Appointment {
  return {
    id: String(row.id),
    clientName: row.client_name ?? row.clientName ?? '',
    service: row.service ?? '',
    date: typeof row.date === 'string' ? row.date : String(row.date ?? ''),
    time: typeof row.time === 'string' ? row.time : String(row.time ?? ''),
    status: row.status ?? 'pending',
    stylist: row.stylist ?? row.stylist_id ?? '',
    salonId: row.salon_id ?? row.salonId ?? undefined,
  };
}

function mapAppointmentToRow(payload: Partial<Appointment>) {
  return {
    client_name: payload.clientName,
    service: payload.service,
    date: payload.date,
    time: payload.time,
    status: payload.status,
    stylist: payload.stylist,
    salon_id: payload.salonId,
  };
}

export function useAppointments(salonId?: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const base = supabase.from('appointments').select('id, client_name, service, date, time, status, stylist, stylist_id, salon_id');
    const { data, error } = salonId ? await base.eq('salon_id', salonId) : await base;
    if (error) {
      console.error('Error fetching appointments', error);
      setAppointments([]);
    } else {
      const mapped = ((data as any[]) || []).map(mapRowToAppointment);
      setAppointments(mapped);
    }
    setLoading(false);
  }, [salonId]);

  useEffect(() => {
    fetchAppointments();
    const subscription = supabase
      .channel('app:appointments')
      .on('postgres_changes', { event: '*', schema: 'app', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAppointments]);

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


