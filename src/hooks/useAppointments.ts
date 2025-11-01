import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Appointment as FullAppointment } from '../types';
import { demoStore } from '../demo/store';
import { isValidUUID } from '../lib/uuid';
import { appointmentsStore } from '../stores/appointments';

export interface Appointment {
  id: string;
  clientName: string;
  service: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  stylist: string;
  salonId: string;
  notes?: string;
  created_by?: string;
}

function mapRowToAppointment(row: any): Appointment {
  const startsAt = row.starts_at ? new Date(row.starts_at) : new Date();
  // Usar fecha y hora locales para alinear con el calendario del cliente
  const yyyy = startsAt.getFullYear();
  const mm = String(startsAt.getMonth() + 1).padStart(2, '0');
  const dd = String(startsAt.getDate()).padStart(2, '0');
  const date = `${yyyy}-${mm}-${dd}`;
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
  const row: any = {};
  
  // Solo incluir campos que están presentes en el payload
  if (payload.clientName !== undefined) {
    row.client_name = payload.clientName;
  }
  if (payload.service !== undefined) {
    row.service_id = payload.service || null;
  }
  if (payload.status !== undefined) {
    row.status = payload.status;
  }
  if (payload.stylist !== undefined) {
    row.stylist_id = payload.stylist || null;
  }
  if (payload.salonId !== undefined) {
    row.salon_id = payload.salonId;
  }
  if (payload.notes !== undefined) {
    row.notes = payload.notes || null;
  }
  if (payload.created_by !== undefined) {
    row.created_by = payload.created_by || null;
  }
  
  // Construir starts_at correctamente: date + time en formato ISO
  if (payload.date && payload.time) {
    const dateStr = payload.date; // Formato: YYYY-MM-DD
    const timeStr = payload.time; // Formato: HH:MM
    const localDate = new Date(`${dateStr}T${timeStr}:00`);
    row.starts_at = localDate.toISOString();
  } else if (payload.date !== undefined || payload.time !== undefined) {
    // Si solo viene date o time, necesitamos obtener el otro del appointment existente
    // Por ahora, si falta uno, no actualizamos starts_at
    // Esto se manejará en el componente que llama
  }
  
  return row;
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
        // Map demo appointments to the expected format
        const mapped = (data as any[]).map((item: any) => mapRowToAppointment(item));
        setAppointments(mapped);
        return;
      }

      if (salonId && !isValidUUID(salonId)) {
        setAppointments([]);
        return;
      }

      let base = supabase
        .from('appointments')
        .select('id, org_id, salon_id, service_id, stylist_id, client_name, client_phone, client_email, starts_at, status, total_amount, notes, created_by, created_at, updated_at');
      // Asegurar scoping por organización si está disponible
      if (currentOrgId) {
        base = base.eq('org_id', currentOrgId);
      }
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
  }, [salonId, enabled, isDemo, currentOrgId]);

  useEffect(() => {
    if (!enabled) return;
    fetchAppointments();
    if (isDemo || subscribed.current) return;
    try {
      const channelPublic = supabase
        .channel('realtime:public:appointments')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
          fetchAppointments();
        })
        .subscribe();

      const channelApp = supabase
        .channel('realtime:app:appointments')
        .on('postgres_changes', { event: '*', schema: 'app', table: 'appointments' }, () => {
          fetchAppointments();
        })
        .subscribe();

      subscribed.current = true;
      return () => {
        try { channelPublic.unsubscribe(); } catch {}
        try { channelApp.unsubscribe(); } catch {}
        subscribed.current = false;
      };
    } catch {
      // si falla realtime, no rompemos el flujo
    }
  }, [fetchAppointments]);

  // Sincronizar estado local al store global
  useEffect(() => {
    try {
      // map 1:1 ya que las props coinciden con AppointmentLite
      appointmentsStore.setAll(appointments as any);
    } catch {}
  }, [appointments]);

  const createAppointment = async (appointmentData: Partial<Appointment>) => {
    if (!salonId || (!isDemo && !isValidUUID(salonId))) {
      throw new Error('Salón inválido');
    }
    if (isDemo) {
      const newApt: Appointment = {
        ...appointmentData as Appointment,
        id: Date.now().toString(),
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
      .from('app.appointments')
      .insert([row])
      .select()
      .single();

    if (error) throw error;
    await fetchAppointments();
    return mapRowToAppointment(data);
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    if (isDemo) {
      const updated = appointments.find(apt => apt.id === id);
      if (updated) {
        setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt));
        return { ...updated, ...updates };
      }
      return;
    }
    
    // Si solo se está actualizando status, usar RPC directamente
    if (Object.keys(updates).length === 1 && updates.status) {
      const { data: rpcData, error: rpcError } = await supabase.rpc('update_appointment_status', {
        p_appointment_id: id,
        p_status: updates.status
      });
      if (rpcError) throw rpcError;
      await fetchAppointments();
      return rpcData ? mapRowToAppointment(rpcData) : null;
    }
    
    // Para otros updates, usar mapAppointmentToRow
    const row = mapAppointmentToRow(updates);
    const { data, error } = await supabase
      .from('appointments')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await fetchAppointments();
    return data ? mapRowToAppointment(data) : null;
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

  // Versión corregida: permite especificar salonId en el payload
  const createAppointmentFixed = async (appointmentData: Partial<Appointment>) => {
    const targetSalonId = (appointmentData.salonId ?? salonId) as string | undefined;
    if (!targetSalonId || (!isDemo && !isValidUUID(targetSalonId))) {
      throw new Error('Salón inválido');
    }

    // Validar campos requeridos
    if (!appointmentData.clientName || !appointmentData.date || !appointmentData.time) {
      throw new Error('Faltan campos requeridos: cliente, fecha y hora');
    }

    if (isDemo) {
      const newApt: Appointment = {
        ...appointmentData as Appointment,
        salonId: targetSalonId,
        id: Date.now().toString(),
        status: appointmentData.status || 'pending',
      };
      setAppointments(prev => [newApt, ...prev]);
      return newApt;
    }

    const row = {
      ...mapAppointmentToRow({ ...appointmentData, salonId: targetSalonId }),
      org_id: currentOrgId || null,
      created_by: user?.id || null,
    } as any;

    const { data, error } = await supabase
      .from('app.appointments')
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      throw new Error(error.message || 'Error al crear el turno');
    }
    
    // Recargar inmediatamente para reflejar en calendario
    await fetchAppointments();
    return mapRowToAppointment(data);
  };

  return {
    appointments,
    isLoading: loading,
    fetchAppointments,
    createAppointment: createAppointmentFixed,
    updateAppointment,
    deleteAppointment,
  };
}

