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

export function useAppointments(salonId?: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const q = salonId ? supabase.from('appointments').select('*').eq('salon_id', salonId) : supabase.from('appointments').select('*');
    const { data, error } = await q;
    if (error) {
      console.error('Error fetching appointments', error);
      setAppointments([]);
    } else {
      setAppointments((data as any[]) || []);
    }
    setLoading(false);
  }, [salonId]);

  useEffect(() => {
    fetchAppointments();
    const subscription = supabase
      .channel('public:appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAppointments();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAppointments]);

  const createAppointment = async (payload: Partial<Appointment>) => {
    const { data, error } = await supabase.from('appointments').insert([payload]);
    if (error) throw error;
    await fetchAppointments();
    return data;
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const { data, error } = await supabase.from('appointments').update(updates).eq('id', id);
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


