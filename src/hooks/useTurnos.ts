/**
 * useTurnos - Hook de alto nivel para turnos
 * 
 * API simplificada para componentes que encapsula turnosStore + useAppointments.
 * Proporciona una interfaz limpia para trabajar con turnos sin exponer detalles internos.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { turnosStore, type Turno, type AppointmentStatus, type TurnosFilters, subscribeTurnosStore } from '../stores/turnosStore';
import { useAppointments } from './useAppointments';
import { useEmployees } from './useEmployees';
import { useSalonEmployees } from './useSalonEmployees';
import { useAuth } from '../contexts/AuthContext';
import type { Appointment } from './useAppointments';

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
  
  // Hook de appointments (puente) - mantiene compatibilidad
  const { 
    appointments, 
    isLoading: appointmentsLoading,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  } = useAppointments(salonId || undefined, { enabled });
  
  // Empleados y asignaciones para validaciones
  const { employees } = useEmployees(currentOrgId ?? undefined, { enabled: true });
  const { assignments: salonEmployeeAssignments } = useSalonEmployees(
    salonId || undefined,
    { enabled: !!salonId }
  );
  
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
  const filteredTurnos = useMemo(() => {
    return turnosStore.getFiltered();
  }, [storeTurnos, storeFilters]);
  
  // Acciones
  const createTurno = useCallback(async (turno: Partial<Turno>): Promise<Turno> => {
    // Validar antes de crear
    const validation = turnosStore.validateTurno(turno, employees, salonEmployeeAssignments, currentOrgId || '');
    if (!validation.valid) {
      throw new Error(validation.message || 'Validación falló');
    }
    
    // Verificar conflictos
    const conflictCheck = turnosStore.checkConflicts(turno);
    if (!conflictCheck.valid) {
      throw new Error(conflictCheck.message || 'Hay un conflicto de horarios');
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
    
    // Actualizar store
    turnosStore.upsert(createdTurno);
    
    return createdTurno;
  }, [createAppointment, employees, salonEmployeeAssignments, currentOrgId, salonId]);
  
  const updateTurno = useCallback(async (id: string, updates: Partial<Turno>): Promise<Turno | null> => {
    // Validar si hay cambios que requieren validación
    if (updates.stylist || updates.salonId || updates.date || updates.time) {
      const existing = turnosStore.appointments.find(t => t.id === id);
      if (!existing) {
        throw new Error('Turno no encontrado');
      }
      
      const updated = { ...existing, ...updates };
      const validation = turnosStore.validateTurno(updated, employees, salonEmployeeAssignments, currentOrgId || '');
      if (!validation.valid) {
        throw new Error(validation.message || 'Validación falló');
      }
      
      // Verificar conflictos (excluyendo el turno actual)
      const conflictCheck = turnosStore.checkConflicts(updated, id);
      if (!conflictCheck.valid) {
        throw new Error(conflictCheck.message || 'Hay un conflicto de horarios');
      }
    }
    
    // Actualizar usando useAppointments
    const appointmentUpdates: Partial<Appointment> = {
      clientName: updates.clientName,
      service: updates.service,
      date: updates.date,
      time: updates.time,
      status: updates.status,
      stylist: updates.stylist,
      salonId: updates.salonId,
      notes: updates.notes,
    };
    
    const updated = await updateAppointment(id, appointmentUpdates);
    if (!updated) return null;
    
    // Convertir a Turno y actualizar store
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
    
    turnosStore.upsert(updatedTurno);
    
    return updatedTurno;
  }, [updateAppointment, employees, salonEmployeeAssignments, currentOrgId]);
  
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
    return turnosStore.checkConflicts(turno, excludeId);
  }, []);
  
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

