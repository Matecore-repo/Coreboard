/**
 * useTurnos - Hook de alto nivel para turnos
 * 
 * API simplificada para componentes que encapsula turnosStore + useAppointments.
 * Proporciona una interfaz limpia para trabajar con turnos sin exponer detalles internos.
 */

import { useState, useEffect, useCallback } from 'react';
import { turnosStore, type Turno, type AppointmentStatus, type TurnosFilters, subscribeTurnosStore } from '../stores/turnosStore';
import { useAppointments } from './useAppointments';
import { useEmployees } from './useEmployees';
import { useSalonEmployees } from './useSalonEmployees';
import { useSalonServices } from './useSalonServices';
import { useAuth } from '../contexts/AuthContext';
import type { Appointment } from './useAppointments';
import supabase from '../lib/supabase';

export interface UseTurnosOptions {
  salonId?: string | null;
  enabled?: boolean;
}

export interface UseTurnosReturn {
  // Datos
  turnos: Turno[];
  loading: boolean;
  filters: TurnosFilters;
  
  // Acciones
  createTurno: (turno: Partial<Turno>) => Promise<Turno>;
  updateTurno: (id: string, updates: Partial<Turno>) => Promise<Turno | null>;
  deleteTurno: (id: string) => Promise<void>;
  setFilters: (filters: Partial<TurnosFilters>) => void;
  setSelectedSalon: (salonId: string | null) => void;
  
  // Selectores (atajos)
  turnosByDate: (fecha: string) => Turno[];
  turnosByStatus: (status: AppointmentStatus) => Turno[];
  turnosByEmployee: (employeeId: string) => Turno[];
  
  // Validaciones
  validateTurno: (turno: Partial<Turno>) => { valid: boolean; error_code?: string; message?: string };
  checkConflicts: (turno: Partial<Turno>, excludeId?: string) => { valid: boolean; conflict?: Turno; message?: string };
}

export function useTurnos(options: UseTurnosOptions = {}): UseTurnosReturn {
  const { salonId, enabled = true } = options;
  const { currentOrgId } = useAuth();
  
  // Convertir 'all' a undefined para que useAppointments no filtre por salon_id
  const effectiveSalonId = salonId === 'all' ? undefined : salonId || undefined;
  
  // Hook de appointments (puente) - mantiene compatibilidad
  const { 
    appointments, 
    isLoading: appointmentsLoading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments(effectiveSalonId, { enabled });
  
  // Empleados y asignaciones para validaciones
  const { employees } = useEmployees(currentOrgId ?? undefined, { enabled: true });
  const { assignments: salonEmployeeAssignments } = useSalonEmployees(
    salonId || undefined,
    { enabled: !!salonId }
  );
  
  // Servicios del salón para obtener duraciones
  const { services: salonServices } = useSalonServices(salonId || undefined, { enabled: !!salonId });
  
  // Función para obtener duración del servicio
  const getServiceDuration = useCallback((serviceId: string, salonIdParam: string): number | null => {
    const service = salonServices.find(s => s.service_id === serviceId && s.salon_id === salonIdParam);
    if (!service) return null;
    return service.duration_override ?? service.duration_minutes ?? null;
  }, [salonServices]);
  
  // Estado local sincronizado con store
  const [storeTurnos, setStoreTurnos] = useState<Turno[]>(turnosStore.appointments);
  const [storeLoading, setStoreLoading] = useState<boolean>(turnosStore.loading);
  const [storeFilters, setStoreFilters] = useState<TurnosFilters>(turnosStore.filters);
  
  // Suscripción a cambios del store
  useEffect(() => {
    const unsubscribe = subscribeTurnosStore(() => {
      setStoreTurnos([...turnosStore.appointments]);
      setStoreLoading(turnosStore.loading);
      setStoreFilters({ ...turnosStore.filters });
    });
    
    // Sincronizar estado inicial
    setStoreTurnos([...turnosStore.appointments]);
    setStoreLoading(turnosStore.loading);
    setStoreFilters({ ...turnosStore.filters });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Turnos filtrados según filtros actuales
  const filteredTurnos = turnosStore.getFiltered();
  
  // Acciones
  const createTurno = useCallback(async (turno: Partial<Turno>): Promise<Turno> => {
    try {
      // Validar que la fecha/hora no sea en el pasado
      if (turno.date && turno.time) {
        const appointmentDateTime = new Date(`${turno.date}T${turno.time}`);
        const now = new Date();
        
        if (appointmentDateTime < now) {
          throw new Error('No se puede crear un turno para una fecha/hora en el pasado');
        }
      }
      
      // Validar antes de crear
      const validation = turnosStore.validateTurno(turno, employees, salonEmployeeAssignments, currentOrgId || '');
      if (!validation.valid) {
        throw new Error(validation.message || 'Error de validación: faltan datos requeridos');
      }
      
      // Verificar conflictos con duración real del servicio
      const conflictCheck = turnosStore.checkConflicts(turno, undefined, getServiceDuration);
      if (!conflictCheck.valid) {
        throw new Error(conflictCheck.message || 'Hay un conflicto de horarios con otro turno');
      }
      
      // Crear usando useAppointments (puente)
      const appointment: Partial<Appointment> = {
        clientName: turno.clientName,
        service: turno.service,
        date: turno.date,
        time: turno.time,
        status: turno.status || 'pending',
        stylist: turno.stylist,
        salonId: turno.salonId || salonId || '',
        notes: turno.notes,
        created_by: turno.created_by,
      };
      
      const created = await createAppointment(appointment);
      
      // Convertir a Turno
      const createdTurno: Turno = {
        id: created.id,
        clientName: created.clientName,
        service: created.service,
        date: created.date,
        time: created.time,
        status: created.status,
        stylist: created.stylist,
        salonId: created.salonId,
        notes: created.notes,
        created_by: created.created_by,
      };
      
      // Actualizar store local inmediatamente
      turnosStore.upsert(createdTurno);
      
      return createdTurno;
    } catch (error: any) {
      // Mejorar mensaje de error para el usuario con diferenciación de tipos
      console.error('Error al crear turno:', error);
      
      // Diferenciar entre errores de validación y errores de base de datos
      if (error.message?.includes('Validación') || error.message?.includes('validación') || 
          error.message?.includes('empleado') || error.message?.includes('salón') ||
          error.message?.includes('conflicto') || error.message?.includes('faltan datos')) {
        // Error de validación: pasar el mensaje tal cual
        throw error;
      } else if (error.message?.includes('PGRST204') || error.message?.includes('schema cache') || 
                 error.message?.includes('column')) {
        // Error de esquema de base de datos
        throw new Error('Error de configuración de la base de datos. Por favor, contacta al administrador.');
      } else {
        // Error genérico
        const errorMessage = error.message || 'Error desconocido al crear el turno';
        throw new Error(`No se pudo crear el turno: ${errorMessage}`);
      }
    }
  }, [createAppointment, employees, salonEmployeeAssignments, currentOrgId, salonId, getServiceDuration]);
  
  const updateTurno = useCallback(async (id: string, updates: Partial<Turno>): Promise<Turno | null> => {
    // Buscar turno existente: primero en store local, luego en BD si no está
    let existing = turnosStore.appointments.find(t => t.id === id);
    
    // Si no está en el store local, buscar en la BD
    if (!existing) {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('id, org_id, salon_id, service_id, stylist_id, client_name, starts_at, status, notes, created_by, total_amount')
          .eq('id', id)
          .single();
        
        if (error || !data) {
          throw new Error('Turno no encontrado en la base de datos');
        }
        
        // Convertir el row de BD a Turno
        const startsAt = data.starts_at ? new Date(data.starts_at) : new Date();
        const yyyy = startsAt.getFullYear();
        const mm = String(startsAt.getMonth() + 1).padStart(2, '0');
        const dd = String(startsAt.getDate()).padStart(2, '0');
        const date = `${yyyy}-${mm}-${dd}`;
        const time = startsAt.toTimeString().slice(0, 5);
        
        existing = {
          id: data.id,
          clientName: data.client_name || '',
          service: data.service_id || '',
          date,
          time,
          status: data.status || 'pending',
          stylist: data.stylist_id || '',
          salonId: data.salon_id || '',
          notes: data.notes || undefined,
          created_by: data.created_by || undefined,
          org_id: data.org_id || undefined,
        };
        
        // Agregar al store local para futuras referencias
        turnosStore.upsert(existing);
      } catch (error: any) {
        throw new Error(error.message || 'Turno no encontrado');
      }
    }
    
    // Comparar campos para determinar qué realmente cambió
    const hasStylistChange = updates.stylist !== undefined && 
                             updates.stylist !== null && 
                             updates.stylist !== '' &&
                             updates.stylist !== existing.stylist;
    const hasSalonChange = updates.salonId !== undefined && updates.salonId !== existing.salonId;
    const hasDateTimeChange = (updates.date !== undefined && updates.date !== existing.date) || 
                             (updates.time !== undefined && updates.time !== existing.time);
    const hasServiceChange = updates.service !== undefined && updates.service !== existing.service;
    const hasClientNameChange = updates.clientName !== undefined && updates.clientName !== existing.clientName;
    const hasNotesChange = updates.notes !== undefined && updates.notes !== existing.notes;
    const hasStatusChange = updates.status !== undefined && updates.status !== existing.status;
    
    // Si se modifican fecha, hora, servicio o estilista, automáticamente poner status como 'pending'
    const shouldAutoSetPending = hasDateTimeChange || hasServiceChange || hasStylistChange || hasSalonChange;
    
    // Solo validar estilista si:
    // 1. El estilista cambió explícitamente, O
    // 2. El salón cambió (necesita revalidar porque el estilista puede no estar asignado al nuevo salón)
    const needsStylistValidation = hasStylistChange || hasSalonChange;
    
    // Validar que la fecha/hora no sea en el pasado
    if (hasDateTimeChange) {
      const date = updates.date !== undefined ? updates.date : existing.date;
      const time = updates.time !== undefined ? updates.time : existing.time;
      
      if (date && time) {
        const appointmentDateTime = new Date(`${date}T${time}`);
        const now = new Date();
        
        if (appointmentDateTime < now) {
          throw new Error('No se puede crear o modificar un turno para una fecha/hora en el pasado');
        }
      }
    }
    
    // Solo validar si hay cambios que requieren validación (stylist, salon, date/time, service)
    // Si solo cambiamos clientName, notes, status, etc., no necesitamos validar estilista
    if (needsStylistValidation || hasDateTimeChange || hasServiceChange) {
      const updated = { ...existing, ...updates };
      
      // Si el estilista no cambió explícitamente, mantener el estilista existente
      if (!hasStylistChange && !hasSalonChange) {
        updated.stylist = existing.stylist;
      } else if (updates.stylist === '' || updates.stylist === null) {
        // Si se está quitando explícitamente (null o ''), usar cadena vacía
        updated.stylist = '';
      }
      
      // Solo validar estilista si realmente cambió o si cambió el salón
      if (needsStylistValidation) {
        const validation = turnosStore.validateTurno(updated, employees, salonEmployeeAssignments, currentOrgId || '');
        if (!validation.valid) {
          throw new Error(validation.message || 'Validación falló');
        }
      }
      
      // Verificar conflictos solo si cambió fecha/hora o stylist (excluyendo el turno actual)
      if (hasDateTimeChange || hasStylistChange) {
        const conflictCheck = turnosStore.checkConflicts(updated, id, getServiceDuration);
        if (!conflictCheck.valid) {
          throw new Error(conflictCheck.message || 'Hay un conflicto de horarios');
        }
      }
    }
    
    // Filtrar appointmentUpdates para enviar solo campos que realmente cambiaron
    const appointmentUpdates: Partial<Appointment> = {};
    
    if (hasClientNameChange) {
      appointmentUpdates.clientName = updates.clientName;
    }
    if (hasServiceChange) {
      appointmentUpdates.service = updates.service;
    }
    if (hasDateTimeChange) {
      if (updates.date !== undefined) appointmentUpdates.date = updates.date;
      if (updates.time !== undefined) appointmentUpdates.time = updates.time;
    }
    // Si se modifican campos relevantes, automáticamente poner status como 'pending'
    // a menos que se esté cambiando explícitamente el status
    if (shouldAutoSetPending && !hasStatusChange) {
      appointmentUpdates.status = 'pending';
    } else if (hasStatusChange) {
      appointmentUpdates.status = updates.status;
    }
    if (hasStylistChange) {
      // Solo incluir stylist si realmente cambió
      appointmentUpdates.stylist = updates.stylist === '' || updates.stylist === null ? undefined : updates.stylist;
    }
    if (hasSalonChange) {
      appointmentUpdates.salonId = updates.salonId;
    }
    if (hasNotesChange) {
      appointmentUpdates.notes = updates.notes;
    }
    
    try {
      const updated = await updateAppointment(id, appointmentUpdates);
      if (!updated) {
        throw new Error('No se pudo actualizar el turno: el turno no existe o no se pudo modificar');
      }
      
      // Convertir a Turno y actualizar store local inmediatamente
      const updatedTurno: Turno = {
        id: updated.id,
        clientName: updated.clientName,
        service: updated.service,
        date: updated.date,
        time: updated.time,
        status: updated.status,
        stylist: updated.stylist,
        salonId: updated.salonId,
        notes: updated.notes,
        created_by: updated.created_by,
      };
      
      // Actualizar store local inmediatamente para reflejar cambios
      turnosStore.upsert(updatedTurno);
      
      // Asegurar que fetchAppointments se ejecute para sincronizar con BD
      // Esto ya se hace en updateAppointment, pero lo aseguramos aquí también
      
      return updatedTurno;
    } catch (error: any) {
      // Mejorar mensaje de error para el usuario con diferenciación de tipos
      console.error('Error al actualizar turno:', error);
      
      // Diferenciar entre errores de validación y errores de base de datos
      if (error.message?.includes('Validación') || error.message?.includes('validación') || 
          error.message?.includes('empleado') || error.message?.includes('salón') ||
          error.message?.includes('conflicto')) {
        // Error de validación: pasar el mensaje tal cual
        throw error;
      } else if (error.message?.includes('no encontrado') || error.message?.includes('PGRST116')) {
        // Error de recurso no encontrado
        throw new Error('El turno que intentas editar ya no existe. Por favor, recarga la página.');
      } else if (error.message?.includes('PGRST204') || error.message?.includes('schema cache') || 
                 error.message?.includes('column')) {
        // Error de esquema de base de datos
        throw new Error('Error de configuración de la base de datos. Por favor, contacta al administrador.');
      } else {
        // Error genérico
        const errorMessage = error.message || 'Error desconocido al actualizar el turno';
        throw new Error(`No se pudo actualizar el turno: ${errorMessage}`);
      }
    }
  }, [updateAppointment, employees, salonEmployeeAssignments, currentOrgId, getServiceDuration]);
  
  const deleteTurno = useCallback(async (id: string): Promise<void> => {
    await deleteAppointment(id);
    turnosStore.remove(id);
  }, [deleteAppointment]);
  
  const setFiltersHandler = useCallback((filters: Partial<TurnosFilters>) => {
    turnosStore.setFilters(filters);
  }, []);
  
  const setSelectedSalonHandler = useCallback((salonId: string | null) => {
    turnosStore.setSelectedSalon(salonId);
  }, []);
  
  // Selectores (atajos)
  const turnosByDate = useCallback((fecha: string): Turno[] => {
    return turnosStore.getByDate(fecha);
  }, []);
  
  const turnosByStatus = useCallback((status: AppointmentStatus): Turno[] => {
    return turnosStore.getByStatus(status);
  }, []);
  
  const turnosByEmployee = useCallback((employeeId: string): Turno[] => {
    return turnosStore.getByEmployee(employeeId);
  }, []);
  
  // Validaciones
  const validateTurnoHandler = useCallback((turno: Partial<Turno>): { valid: boolean; error_code?: string; message?: string } => {
    return turnosStore.validateTurno(turno, employees, salonEmployeeAssignments, currentOrgId || '');
  }, [employees, salonEmployeeAssignments, currentOrgId]);
  
  const checkConflictsHandler = useCallback((turno: Partial<Turno>, excludeId?: string): { valid: boolean; conflict?: Turno; message?: string } => {
    return turnosStore.checkConflicts(turno, excludeId, getServiceDuration);
  }, [getServiceDuration]);
  
  return {
    // Datos
    turnos: filteredTurnos,
    loading: storeLoading || appointmentsLoading,
    filters: storeFilters,
    
    // Acciones
    createTurno,
    updateTurno,
    deleteTurno,
    setFilters: setFiltersHandler,
    setSelectedSalon: setSelectedSalonHandler,
    
    // Selectores
    turnosByDate,
    turnosByStatus,
    turnosByEmployee,
    
    // Validaciones
    validateTurno: validateTurnoHandler,
    checkConflicts: checkConflictsHandler,
  };
}

