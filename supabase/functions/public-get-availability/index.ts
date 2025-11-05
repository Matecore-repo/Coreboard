/**
 * Edge Function: Obtener disponibilidad (público)
 * Calcula slots disponibles para un servicio, profesional y fecha específicos
 */

import { createServiceRoleClient } from '../_shared/supabase-client.ts';

// Horarios por defecto del salón (8am-8pm)
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;

Deno.serve(async (req) => {
  try {
    // Verificar header de autorización (requerido para autenticación con Google)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Autenticación requerida. Por favor inicia sesión con Google.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const salonId = url.searchParams.get('salon_id');
    const stylistId = url.searchParams.get('stylist_id'); // null = cualquier profesional
    const serviceId = url.searchParams.get('service_id');
    const date = url.searchParams.get('date'); // formato: YYYY-MM-DD
    const token = url.searchParams.get('token');

    if (!salonId || !serviceId || !date || !token) {
      return new Response(
        JSON.stringify({ error: 'salon_id, service_id, date y token son requeridos' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validar token
    const tokenData = new TextEncoder().encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', tokenData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const supabase = createServiceRoleClient();
    const { data: link } = await supabase
      .from('payment_links')
      .select('salon_id, active, expires_at')
      .eq('token_hash', tokenHash)
      .eq('active', true)
      .single();

    if (!link || link.salon_id !== salonId) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Obtener duración del servicio
    const { data: salonService } = await supabase
      .from('salon_services')
      .select(`
        duration_override,
        services!inner(duration_minutes)
      `)
      .eq('salon_id', salonId)
      .eq('service_id', serviceId)
      .eq('active', true)
      .single();

    if (!salonService) {
      return new Response(
        JSON.stringify({ error: 'Servicio no disponible en este salón' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const service = Array.isArray(salonService.services) ? salonService.services[0] : salonService.services;
    const durationMinutes = salonService.duration_override || service.duration_minutes;

    // Obtener turnos existentes para esa fecha
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    let appointmentsQuery = supabase
      .from('appointments')
      .select('stylist_id, starts_at')
      .eq('salon_id', salonId)
      .gte('starts_at', dateStart.toISOString())
      .lte('starts_at', dateEnd.toISOString())
      .in('status', ['pending', 'confirmed']); // Solo considerar turnos activos

    // Si se especificó un estilista, filtrar por él
    if (stylistId && stylistId !== 'any') {
      appointmentsQuery = appointmentsQuery.eq('stylist_id', stylistId);
    }

    const { data: existingAppointments } = await appointmentsQuery;

    // Si no se especificó estilista, obtener todos los disponibles del salón
    let availableStylists: string[] = [];
    if (!stylistId || stylistId === 'any') {
      const { data: salonEmployees } = await supabase
        .from('salon_employees')
        .select('employee_id')
        .eq('salon_id', salonId)
        .eq('active', true);
      availableStylists = (salonEmployees || []).map((e: any) => e.employee_id);
    } else {
      availableStylists = [stylistId];
    }

    // Generar slots disponibles (cada 30 minutos de DEFAULT_START_HOUR a DEFAULT_END_HOUR)
    const slots: { time: string; available: boolean }[] = [];
    const bookedSlots = new Set<string>();

    // Marcar slots ocupados
    (existingAppointments || []).forEach((apt: any) => {
      const aptTime = new Date(apt.starts_at);
      const hour = aptTime.getHours();
      const minute = aptTime.getMinutes();
      const slotKey = `${hour}:${minute < 10 ? '0' : ''}${minute}`;
      bookedSlots.add(slotKey);
      
      // Marcar slots ocupados durante la duración del servicio
      let currentMinute = hour * 60 + minute;
      const endMinute = currentMinute + durationMinutes;
      while (currentMinute < endMinute) {
        const slotHour = Math.floor(currentMinute / 60);
        const slotMin = currentMinute % 60;
        if (slotHour < DEFAULT_END_HOUR) {
          const slotKey2 = `${slotHour}:${slotMin < 10 ? '0' : ''}${slotMin}`;
          bookedSlots.add(slotKey2);
        }
        currentMinute += 30; // Verificar cada 30 minutos
      }
    });

    // Generar todos los slots posibles
    for (let hour = DEFAULT_START_HOUR; hour < DEFAULT_END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = `${hour}:${minute < 10 ? '0' : ''}${minute}`;
        const slotKey = `${hour}:${minute < 10 ? '0' : ''}${minute}`;
        
        // Verificar si el slot cabe dentro del horario considerando la duración
        const slotStartMinutes = hour * 60 + minute;
        const slotEndMinutes = slotStartMinutes + durationMinutes;
        if (slotEndMinutes <= DEFAULT_END_HOUR * 60) {
          slots.push({
            time: slotTime,
            available: !bookedSlots.has(slotKey) && availableStylists.length > 0,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ slots }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en public-get-availability:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
