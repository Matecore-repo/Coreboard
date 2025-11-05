import { useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Appointment as FullAppointment } from '../types';
import { demoStore } from '../demo/store';
import { isValidUUID } from '../lib/uuid';
import { appointmentsStore } from '../stores/appointments';
import { turnosStore, type Turno } from '../stores/turnosStore';

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
  org_id?: string;
  total_amount?: number;
}

function mapRowToAppointment(row: any): Appointment {
  const startsAt = row.starts_at ? new Date(row.starts_at) : new Date();
  // Usar fecha y hora locales para alinear con el calendario del cliente
  const yyyy = startsAt.getFullYear();
  const mm = String(startsAt.getMonth() + 1).padStart(2, '0');
  const dd = String(startsAt.getDate()).padStart(2, '0');
  const date = `${yyyy}-${mm}-${dd}`;
  const time = startsAt.toTimeString().slice(0, 5);

  // La tabla appointments en public usa client_name directamente
  const clientName = row.client_name || row.clients?.full_name || '';

  return {
    id: row.id,
    clientName,
    service: row.service_id || '',
    date,
    time,
    status: row.status || 'pending',
    stylist: row.stylist_id || row.employee_id || '',
    salonId: row.salon_id || '',
    notes: row.notes || undefined,
    created_by: row.created_by || undefined,
    org_id: row.org_id || undefined,
    total_amount: row.total_amount || 0,
  };
}

function mapAppointmentToRow(payload: Partial<Appointment>) {
  const row: any = {};
  
  // Solo incluir campos que están presentes en el payload
  // La tabla appointments en public tiene service_id y client_name directamente
  if (payload.clientName !== undefined) {
    row.client_name = payload.clientName || null;
  }
  if (payload.service !== undefined && payload.service !== null && payload.service !== '') {
    row.service_id = payload.service || null;
  }
  if (payload.status !== undefined) {
    row.status = payload.status;
  }
  if (payload.stylist !== undefined && payload.stylist !== null && payload.stylist !== '') {
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
  
  // Asegurar que total_amount siempre tenga un valor (requerido por la BD)
  // Solo incluir si viene en el payload
  if ((payload as any).total_amount !== undefined) {
    row.total_amount = (payload as any).total_amount;
  }
  
  // Campos financieros adicionales
  if ((payload as any).paymentMethod !== undefined) {
    row.payment_method = (payload as any).paymentMethod || null;
  }
  if ((payload as any).discountAmount !== undefined) {
    row.discount_amount = (payload as any).discountAmount || null;
  }
  if ((payload as any).taxAmount !== undefined) {
    row.tax_amount = (payload as any).taxAmount || null;
  }
  if ((payload as any).tipAmount !== undefined) {
    row.tip_amount = (payload as any).tipAmount || null;
  }
  if ((payload as any).totalCollected !== undefined) {
    row.total_collected = (payload as any).totalCollected || null;
  }
  if ((payload as any).directCost !== undefined) {
    row.direct_cost = (payload as any).directCost || null;
  }
  if ((payload as any).bookingSource !== undefined) {
    row.booking_source = (payload as any).bookingSource || null;
  }
  if ((payload as any).campaignCode !== undefined) {
    row.campaign_code = (payload as any).campaignCode || null;
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
    turnosStore.setLoading(true);
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
        .select(`
          id, 
          org_id, 
          salon_id, 
          service_id,
          stylist_id, 
          client_name,
          client_phone,
          client_email,
          starts_at, 
          status, 
          total_amount, 
          notes, 
          created_by, 
          created_at, 
          updated_at
        `);
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
      turnosStore.setLoading(false);
    }
  }, [salonId, enabled, isDemo, currentOrgId]);

  useEffect(() => {
    if (!enabled) return;
    fetchAppointments();
    if (isDemo || subscribed.current) return;
    
    let channelApp: any = null;
    
    try {
      // Solo suscribirse a la tabla real app.appointments
      // La vista public.appointments no puede tener realtime
      // RLS filtrará automáticamente qué cambios puede ver cada usuario
      channelApp = supabase
        .channel('realtime:app:appointments')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'app', 
          table: 'appointments'
        }, () => {
          // Refrescar appointments cuando hay cambios
          // fetchAppointments ya filtra por currentOrgId
          fetchAppointments();
        })
        .subscribe();

      subscribed.current = true;
      
      return () => {
        if (channelApp) {
          try { 
            channelApp.unsubscribe(); 
          } catch (e) {
            console.error('Error unsubscribing from realtime:', e);
          }
        }
        subscribed.current = false;
      };
    } catch (e) {
      // si falla realtime, no rompemos el flujo
      console.error('Error setting up realtime subscription:', e);
      subscribed.current = false;
    }
  }, [enabled, isDemo, fetchAppointments, currentOrgId]);

  // Sincronizar estado local al store global (appointmentsStore y turnosStore)
  useEffect(() => {
    try {
      // Sincronizar con appointmentsStore (compatibilidad)
      appointmentsStore.setAll(appointments as any);
      
      // Sincronizar con turnosStore (nuevo cerebro global)
      const turnos: Turno[] = appointments.map(apt => ({
        id: apt.id,
        clientName: apt.clientName,
        service: apt.service,
        date: apt.date,
        time: apt.time,
        status: apt.status,
        stylist: apt.stylist,
        salonId: apt.salonId,
        notes: apt.notes,
        created_by: apt.created_by,
        org_id: apt.org_id,
        total_amount: apt.total_amount || 0,
      }));
      turnosStore.setAll(turnos);
      turnosStore.setLoading(false);
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
    
    // Obtener total_amount desde totalCollected o listPrice o calcular desde servicio
    let totalAmount = (appointmentData as any).total_amount || (appointmentData as any).totalCollected || (appointmentData as any).listPrice || 0;
    if (!totalAmount && appointmentData.service) {
      const { data: serviceData } = await supabase
        .from('services')
        .select('base_price')
        .eq('id', appointmentData.service)
        .single();
      if (serviceData?.base_price) {
        totalAmount = Number(serviceData.base_price);
      }
    }
    
    const row = {
      ...mapAppointmentToRow({ ...appointmentData, salonId }),
      org_id: currentOrgId || null,
      total_amount: totalAmount,
      created_by: user?.id || null,
    } as any;
    const { data, error } = await supabase
      .from('appointments')
      .insert([row])
      .select()
      .single();

    if (error) throw error;
    
    // Crear appointment_item si hay service_id
    if (data && appointmentData.service) {
      const { error: itemError } = await supabase
        .from('appointment_items')
        .insert([{
          appointment_id: data.id,
          service_id: appointmentData.service,
          quantity: 1,
          unit_price: totalAmount,
        }]);
      
      if (itemError) {
        console.error('Error creating appointment_item:', itemError);
        // No fallar si el item falla, el appointment ya está creado
      }
    }
    
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
    // Si el RPC falla (por ejemplo, si el enum no existe), usar update directo
    if (Object.keys(updates).length === 1 && updates.status) {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('update_appointment_status', {
          p_appointment_id: id,
          p_status: updates.status
        });
        if (rpcError) throw rpcError;
        await fetchAppointments();
        return rpcData ? mapRowToAppointment(rpcData) : null;
      } catch (error: any) {
        // Si el RPC falla (por ejemplo, error de tipo enum o columnas), usar update directo como fallback
        if (error?.code === '42804' || error?.code === '42703' || error?.message?.includes('appointment_status') || error?.message?.includes('does not exist')) {
          // Solo actualizar el estado sin select, luego refrescar la lista
          const { error: updateError } = await supabase
            .from('appointments')
            .update({ status: updates.status, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (updateError) throw updateError;
          // Refrescar la lista para obtener el estado actualizado
          await fetchAppointments();
          // El estado se actualiza en el estado local, retornar el appointment actualizado
          const updatedAppointment = appointments.find(apt => apt.id === id);
          if (updatedAppointment) {
            // Actualizar el estado local antes de retornar
            if (updates.status) {
              setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, status: updates.status! } : apt));
              return { ...updatedAppointment, status: updates.status };
            }
            return updatedAppointment;
          }
          return null;
        }
        throw error;
      }
    }
    
    // Para otros updates, usar mapAppointmentToRow
    const row = mapAppointmentToRow(updates);
    // Filtrar campos undefined/null para evitar errores de actualización
    const cleanRow = Object.fromEntries(
      Object.entries(row).filter(([_, value]) => value !== undefined && value !== null)
    );
    
    // Si no hay campos para actualizar, retornar el appointment actual
    if (Object.keys(cleanRow).length === 0) {
      await fetchAppointments();
      const currentAppointment = appointments.find(apt => apt.id === id);
      return currentAppointment || null;
    }
    
    const { data, error } = await supabase
      .from('appointments')
      .update(cleanRow)
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

    // Validar que haya organización activa (modo real)
    if (!currentOrgId) {
      throw new Error('No hay organización seleccionada. No se puede crear el turno.');
    }

    if (!user?.id) {
      throw new Error('Usuario no autenticado. No se puede crear el turno.');
    }

    // Calcular total_amount desde el servicio si no viene en appointmentData
    let totalAmount = (appointmentData as any).total_amount;
    if (!totalAmount && appointmentData.service) {
      // Primero intentar obtener price_override desde salon_services
      if (targetSalonId) {
        const { data: salonServiceData } = await supabase
          .from('salon_services')
          .select('price_override, services!inner(base_price)')
          .eq('salon_id', targetSalonId)
          .eq('service_id', appointmentData.service)
          .eq('active', true)
          .single();
        
        if (salonServiceData) {
          const service = Array.isArray(salonServiceData.services) 
            ? salonServiceData.services[0] 
            : salonServiceData.services;
          totalAmount = salonServiceData.price_override ?? service?.base_price ?? 0;
        }
      }
      
      // Si no se obtuvo desde salon_services, consultar directamente services
      if (!totalAmount) {
        const { data: serviceData } = await supabase
          .from('services')
          .select('base_price')
          .eq('id', appointmentData.service)
          .single();
        
        if (serviceData?.base_price) {
          totalAmount = Number(serviceData.base_price);
        }
      }
    }

    // Si aún no hay totalAmount, usar 0 como fallback
    if (!totalAmount) {
      totalAmount = 0;
    }

    const row = {
      ...mapAppointmentToRow({ ...appointmentData, salonId: targetSalonId }),
      org_id: currentOrgId, // Siempre debe tener org_id
      created_by: user.id, // Siempre debe tener created_by
      total_amount: totalAmount, // Incluir total_amount calculado
      // Incluir payment_method si viene en appointmentData (por defecto 'cash')
      payment_method: (appointmentData as any).paymentMethod || 'cash',
    } as any;

    const { data, error } = await supabase
      .from('appointments')
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

