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
  serviceName?: string;
  servicePrice?: number | null;
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

  const serviceId = row.service_id || '';
  const serviceName =
    row.services?.name ||
    row.salon_services?.service_name ||
    row.service_name ||
    '';
  const servicePrice =
    row.total_amount ??
    row.services?.base_price ??
    row.salon_services?.price_override ??
    null;

  // Resolver nombre del estilista del join o usar UUID como fallback
  const stylistId = row.stylist_id || row.employee_id || '';
  const stylistName = row.employees?.full_name || null;

  return {
    id: row.id,
    clientName,
    service: serviceId,
    serviceName,
    servicePrice,
    date,
    time,
    status: row.status || 'pending',
    // Si tenemos el nombre del estilista, usarlo; si no, usar UUID (se resolverá en la UI)
    stylist: stylistName || stylistId,
    salonId: row.salon_id || '',
    notes: row.notes || undefined,
    created_by: row.created_by || undefined,
    org_id: row.org_id || undefined,
    total_amount: row.total_amount || servicePrice || 0,
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
  const [loading, setLoading] = useState(true);
  const enabled = options?.enabled ?? true;
  const subscribed = useRef(false);
  const { isDemo, user, currentOrgId } = useAuth() as any;

  const fetchAppointments = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      turnosStore.setLoading(false);
      return;
    }
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
        setLoading(false);
        turnosStore.setLoading(false);
        return;
      }

      const selectWithServices = `
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
        updated_at,
        services!service_id (
          name,
          base_price
        ),
        employees!stylist_id (
          full_name
        )
      `;

      const basicSelect = `
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
      `;

      const runQuery = async (selectClause: string, timeoutMs: number = 10000) => {
        let query = supabase.from('appointments').select(selectClause);
        if (currentOrgId) {
          query = query.eq('org_id', currentOrgId);
        }
        if (salonId) {
          query = query.eq('salon_id', salonId);
        }
        
        // Agregar timeout a la query
        const queryPromise = query.order('starts_at');
        const timeoutPromise = new Promise<{ data: null; error: { code: string; message: string } }>((_, reject) => 
          setTimeout(() => reject({ code: 'TIMEOUT', message: 'Query timeout' }), timeoutMs)
        );
        
        try {
          return await Promise.race([queryPromise, timeoutPromise]);
        } catch (timeoutError: any) {
          if (timeoutError.code === 'TIMEOUT') {
            return { data: null, error: timeoutError };
          }
          throw timeoutError;
        }
      };

      let { data, error } = await runQuery(selectWithServices);

      // Si el join falla (PGRST200 = relación no encontrada, 42703 = columna no existe), usar fallback
      if (error && (error.code === 'PGRST200' || error.code === '42703' || error.code === 'TIMEOUT' || error.message?.includes('Could not find a relationship'))) {
        if (error.code !== 'TIMEOUT') {
          console.warn('Falling back to appointments select without services/employees join:', error.message);
        }
        const fallback = await runQuery(basicSelect);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        // Throttling de logs: solo loguear una vez cada 5 segundos para el mismo error
        const errorKey = `${error.code || 'unknown'}:${currentOrgId}:${salonId || 'all'}`;
        const lastErrorTime = (globalThis as any).__lastAppointmentsError?.[errorKey] || 0;
        const now = Date.now();
        if (now - lastErrorTime > 5000) {
          console.error('Error fetching appointments:', error);
          if (!(globalThis as any).__lastAppointmentsError) {
            (globalThis as any).__lastAppointmentsError = {};
          }
          (globalThis as any).__lastAppointmentsError[errorKey] = now;
        }
        setAppointments([]);
      } else {
        const mapped = ((data as any[]) || []).map(mapRowToAppointment);
        setAppointments(mapped);
        // Sincronizar con turnosStore para que los filtros funcionen correctamente
        const turnos = mapped.map(apt => ({
          id: apt.id,
          clientName: apt.clientName,
          service: apt.service || '',
          serviceName: apt.serviceName,
          servicePrice: apt.servicePrice,
          date: apt.date || '',
          time: apt.time || '',
          status: apt.status as any,
          stylist: apt.stylist || '',
          salonId: apt.salonId || '',
          notes: apt.notes,
          created_by: apt.created_by,
          org_id: apt.org_id,
          total_amount: apt.total_amount,
        }));
        turnosStore.setAll(turnos);
      }
    } finally {
      setLoading(false);
      turnosStore.setLoading(false);
    }
  }, [salonId, enabled, isDemo, currentOrgId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      turnosStore.setLoading(false);
      return;
    }
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
        serviceName: apt.serviceName,
        servicePrice: apt.servicePrice,
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
    let clientId: string | null = null;

    if (isDemo) {
      const newApt: Appointment = {
        ...appointmentData as Appointment,
        id: Date.now().toString(),
      };
      setAppointments(prev => [newApt, ...prev]);
      return newApt;
    }
    
    // Obtener total_amount desde totalCollected o listPrice o calcular desde servicio
    // En producción, siempre obtener desde la BD (salon_services con override, luego services base_price)
    let totalAmount = (appointmentData as any).total_amount || (appointmentData as any).totalCollected || (appointmentData as any).listPrice || 0;
    if (!totalAmount && appointmentData.service && salonId) {
      // Primero intentar obtener desde salon_services (puede tener price_override)
      const { data: salonServiceData } = await supabase
        .from('salon_services')
        .select(`
          price_override,
          services!inner (
            base_price
          )
        `)
        .eq('salon_id', salonId)
        .eq('service_id', appointmentData.service)
        .eq('active', true)
        .single();
      
      if (salonServiceData) {
        // Usar price_override si existe, sino base_price del servicio
        const serviceBasePrice = Array.isArray(salonServiceData.services)
          ? salonServiceData.services[0]?.base_price
          : (salonServiceData.services as { base_price?: number } | undefined)?.base_price;
        totalAmount = salonServiceData.price_override ?? serviceBasePrice ?? 0;
      } else {
        // Si no hay salon_service, obtener directamente desde services
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
    
    // Crear o obtener cliente si no existe
    if (appointmentData.clientName && currentOrgId && !isDemo) {
      const clientName = appointmentData.clientName.trim();
      
      try {
        // Buscar cliente existente por nombre (case-insensitive)
        const { data: existingClients } = await supabase
          .from('clients')
          .select('id')
          .eq('org_id', currentOrgId)
          .ilike('full_name', clientName)
          .is('deleted_at', null)
          .limit(1);
        
        if (!existingClients || existingClients.length === 0) {
          // Crear cliente nuevo si no existe
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert([{
              full_name: clientName,
              phone: (appointmentData as any).client_phone || null,
              email: (appointmentData as any).client_email || null,
              org_id: currentOrgId,
            }])
            .select('id')
            .single();
          
          if (clientError) {
            console.error('Error creando cliente:', clientError);
            // Continuar sin client_id si falla la creación (el appointment puede tener client_name)
          }
          if (newClient?.id) {
            clientId = newClient.id;
          }
        } else {
          clientId = existingClients[0]?.id ?? null;
        }
      } catch (clientError) {
        console.error('Error buscando/creando cliente:', clientError);
        // Continuar sin client_id si falla (el appointment puede tener client_name)
      }
    }
    
    const row = {
      ...mapAppointmentToRow({ ...appointmentData, salonId }),
      org_id: currentOrgId || null,
      total_amount: totalAmount,
      created_by: user?.id || null,
      ...(clientId ? { client_id: clientId } : {}),
    } as any;
    if (appointmentData.service) {
      row.service_id = appointmentData.service;
    }
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
    
    // Si solo se está actualizando status, usar RPC directamente (maneja el enum correctamente)
    if (Object.keys(updates).length === 1 && updates.status) {
      try {
        // Usar RPC que maneja el casting del enum correctamente
        const { data: rpcData, error: rpcError } = await supabase.rpc('update_appointment_status', {
          p_appointment_id: id,
          p_status: updates.status
        });
        
        if (rpcError) {
          // Si el RPC directo falla, intentar la RPC genérica que maneja casting y nullables
          try {
            const { data: fallbackData, error: fallbackError } = await supabase.rpc('update_appointment_rpc', {
              p_appointment_id: id,
              p_status: updates.status,
            });

            if (fallbackError) {
              throw new Error(
                `Error al actualizar el estado: ${rpcError?.message || fallbackError?.message || 'Error desconocido'}`,
              );
            }
            
            // Refrescar la lista para obtener el estado actualizado
            await fetchAppointments();
            const updatedAppointment = appointments.find(apt => apt.id === id);
            if (updatedAppointment) {
              setAppointments(prev =>
                prev.map(apt => (apt.id === id ? { ...apt, status: updates.status! } : apt)),
              );
              return { ...updatedAppointment, status: updates.status };
            }
            const normalizedFallback = Array.isArray(fallbackData)
              ? fallbackData[0]
              : typeof fallbackData === 'string'
                ? JSON.parse(fallbackData)
                : fallbackData;
            return normalizedFallback ? mapRowToAppointment(normalizedFallback) : null;
          } catch (fallbackError: any) {
            throw new Error(`Error al actualizar el estado: ${rpcError?.message || fallbackError?.message || 'Error desconocido'}`);
          }
        }
        
        // El RPC fue exitoso, refrescar la lista
        await fetchAppointments();
        const normalizedRpc = Array.isArray(rpcData)
          ? rpcData[0]
          : typeof rpcData === 'string'
            ? JSON.parse(rpcData)
            : rpcData;
        return normalizedRpc ? mapRowToAppointment(normalizedRpc) : null;
      } catch (error: any) {
        console.error('Error updating appointment status:', error);
        const message = error?.message || '';
        if (message.includes('appointment_status') || message.includes('enum')) {
          throw new Error(
            'No se pudo actualizar el estado porque la función update_appointment_status no castea correctamente al enum appointment_status. Ejecutá las últimas migraciones o sincronizá la base de datos.',
          );
        }
        throw new Error(`Error al actualizar el estado: ${message || 'Error desconocido'}`);
      }
    }
    
  // Recalcular total_amount si cambió el servicio y no viene explícitamente en updates
  if (updates.service !== undefined && (updates as any).total_amount === undefined) {
    const targetSalonId = updates.salonId ?? salonId;
    if (targetSalonId && updates.service) {
      try {
        // Obtener precio del servicio desde salon_services o services
        const { data: salonServiceData } = await supabase
          .from('salon_services')
          .select('price_override, services!inner(base_price)')
          .eq('salon_id', targetSalonId)
          .eq('service_id', updates.service)
          .eq('active', true)
          .single();
        
        if (salonServiceData) {
          const service = Array.isArray(salonServiceData.services) 
            ? salonServiceData.services[0] 
            : salonServiceData.services;
          (updates as any).total_amount = salonServiceData.price_override ?? service?.base_price ?? 0;
        } else {
          // Si no se obtuvo desde salon_services, consultar directamente services
          const { data: serviceData } = await supabase
            .from('services')
            .select('base_price')
            .eq('id', updates.service)
            .single();
          
          if (serviceData?.base_price) {
            (updates as any).total_amount = Number(serviceData.base_price);
          } else {
            (updates as any).total_amount = 0;
          }
        }
      } catch (error) {
        console.error('Error calculating total_amount from service:', error);
        // Si falla, usar 0 como fallback
        (updates as any).total_amount = 0;
      }
    }
  }

  // Para otros updates, usar mapAppointmentToRow
  const row = mapAppointmentToRow(updates);
  // Filtrar campos undefined/null para evitar errores de actualización
  // También excluir service_id si no viene explícitamente en updates (para evitar errores de columna)
  const cleanRow = Object.fromEntries(
    Object.entries(row).filter(([key, value]) => {
      // Si service_id está presente pero service no viene en updates, no incluirlo
      if (key === 'service_id' && updates.service === undefined) {
        return false;
      }
      return value !== undefined && value !== null;
    })
  );
    
    // Si no hay campos para actualizar, retornar el appointment actual
    if (Object.keys(cleanRow).length === 0) {
      await fetchAppointments();
      const currentAppointment = appointments.find(apt => apt.id === id);
      return currentAppointment || null;
    }
    
    // Construir SELECT dinámicamente basado en las columnas que realmente existen
    // Si hay error de columna, intentar sin service_id primero
    const selectColumns = 'id,org_id,salon_id,stylist_id,client_name,client_phone,client_email,starts_at,status,total_amount,notes,created_by,created_at,updated_at';
    const selectWithService = 'id,org_id,salon_id,service_id,stylist_id,client_name,client_phone,client_email,starts_at,status,total_amount,notes,created_by,created_at,updated_at';
    
    // Intentar primero con service_id si está en cleanRow
    const selectCols = cleanRow.service_id !== undefined ? selectWithService : selectColumns;
    
    const { data, error } = await supabase
      .from('appointments')
      .update(cleanRow)
      .eq('id', id)
      .select(selectCols as any)
      .single();

    if (error) {
      console.error('Error updating appointment:', error);
      
      // Manejar errores específicos
      if (error.code === 'PGRST116') {
        throw new Error('Turno no encontrado en la base de datos');
      }
      
      // Si hay error de columna o schema cache, intentar con función RPC
      if (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('column') || error.message?.includes('schema cache')) {
        try {
          // Construir starts_at si hay date y time
          let startsAt = null;
          if (updates.date && updates.time) {
            const dateStr = updates.date;
            const timeStr = updates.time;
            startsAt = new Date(`${dateStr}T${timeStr}:00`).toISOString();
          }
          
          // Usar función RPC como alternativa
          // Solo incluir campos que realmente están en updates
          const rpcParams: any = {
            p_appointment_id: id,
          };
          if (updates.clientName !== undefined) rpcParams.p_client_name = updates.clientName || null;
          if (updates.service !== undefined) rpcParams.p_service_id = updates.service || null;
          if (updates.stylist !== undefined) rpcParams.p_stylist_id = updates.stylist || null;
          if (updates.salonId !== undefined) rpcParams.p_salon_id = updates.salonId || null;
          if (startsAt !== null) rpcParams.p_starts_at = startsAt;
          if (updates.status !== undefined) rpcParams.p_status = updates.status || null;
          if (updates.notes !== undefined) rpcParams.p_notes = updates.notes || null;
          // Incluir total_amount si viene en updates (ya calculado arriba si cambió el servicio)
          if ((updates as any).total_amount !== undefined) {
            rpcParams.p_total_amount = (updates as any).total_amount || null;
          }
          if ((updates as any).client_phone !== undefined) rpcParams.p_client_phone = (updates as any).client_phone || null;
          if ((updates as any).client_email !== undefined) rpcParams.p_client_email = (updates as any).client_email || null;
          
          const { data: rpcData, error: rpcError } = await supabase.rpc('update_appointment_rpc', rpcParams);
          
          if (rpcError) {
            console.error('Error updating appointment via RPC:', rpcError);
            throw new Error(`Error al actualizar el turno: ${rpcError.message || 'Error desconocido'}`);
          }
          
          // El RPC retorna un jsonb, convertir a Appointment
          await fetchAppointments();
          return rpcData ? mapRowToAppointment(rpcData) : null;
        } catch (rpcError: any) {
          // Si el RPC también falla, intentar sin campos opcionales
          const safeRow = { ...cleanRow };
          // Excluir campos que pueden no existir o causar problemas
          delete safeRow.service_id; // No incluir si no viene explícitamente
          delete safeRow.payment_method;
          delete safeRow.discount_amount;
          delete safeRow.tax_amount;
          delete safeRow.tip_amount;
          delete safeRow.total_collected;
          delete safeRow.direct_cost;
          delete safeRow.booking_source;
          delete safeRow.campaign_code;
          
          // Usar SELECT sin service_id si no está en safeRow
          const retrySelectCols = safeRow.service_id !== undefined ? selectWithService : selectColumns;
          
          const { data: retryData, error: retryError } = await supabase
            .from('appointments')
            .update(safeRow)
            .eq('id', id)
            .select(retrySelectCols as any)
            .single();
          
          if (retryError) {
            throw new Error(`Error al actualizar el turno: ${retryError.message || 'Error desconocido'}`);
          }
          
          await fetchAppointments();
          return retryData ? mapRowToAppointment(retryData) : null;
        }
      }
      
      throw new Error(`Error al actualizar el turno: ${error.message || 'Error desconocido'}`);
    }
    
    await fetchAppointments();
    return data ? mapRowToAppointment(data) : null;
  };

  const deleteAppointment = async (id: string) => {
    if (isDemo) {
      setAppointments(prev => prev.filter(apt => apt.id !== id));
      return;
    }
    
    // Usar función RPC para borrar desde la tabla real
    const { error } = await supabase.rpc('delete_appointment', {
      p_appointment_id: id
    });

    if (error) {
      console.error('Error deleting appointment:', error);
      // Si la función RPC falla, intentar borrar directamente desde la vista
      // (la regla INSTEAD debería manejarlo)
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
    }
    
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
      // payment_method se maneja condicionalmente en mapAppointmentToRow
      // No forzar su inclusión si la columna no existe en la BD
    } as any;

    const { data, error } = await supabase
      .from('appointments')
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      
      // Manejar errores específicos de forma más clara
      if (error.code === 'PGRST204' || error.message?.includes('column') || error.message?.includes('schema cache')) {
        // Error de columna faltante: intentar sin campos opcionales
        const safeRow = { ...row };
        delete safeRow.payment_method;
        delete safeRow.discount_amount;
        delete safeRow.tax_amount;
        delete safeRow.tip_amount;
        delete safeRow.total_collected;
        delete safeRow.direct_cost;
        delete safeRow.booking_source;
        delete safeRow.campaign_code;
        
        const { data: retryData, error: retryError } = await supabase
          .from('appointments')
          .insert([safeRow])
          .select()
          .single();
        
        if (retryError) {
          throw new Error(`Error al crear el turno: ${retryError.message || 'Error desconocido'}`);
        }
        
        // Recargar inmediatamente para reflejar en calendario
        await fetchAppointments();
        return mapRowToAppointment(retryData);
      }
      
      throw new Error(`Error al crear el turno: ${error.message || 'Error desconocido'}`);
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

