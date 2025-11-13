/**
 * Turnos Store - El "Cerebro" Global de Turnos
 * 
 * Fuente única de verdad para todos los turnos de la aplicación.
 * Centraliza estado, acciones, selectores y validaciones.
 */

import type { Appointment } from '../hooks/useAppointments';
import { validateEmployeeForAppointment, validateEmployeeInSalon } from '../lib/employeeValidator';
import type { Employee } from '../hooks/useEmployees';
import type { SalonEmployee } from '../hooks/useSalonEmployees';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Turno {
  id: string;
  clientName: string;
  service: string;
  serviceName?: string;
  servicePrice?: number | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  stylist: string; // employee_id
  salonId: string;
  notes?: string;
  created_by?: string;
  org_id?: string;
  total_amount?: number;
}

export interface TurnosFilters {
  date?: string; // YYYY-MM-DD o 'today' | 'tomorrow' | 'week' | 'month'
  status?: AppointmentStatus | 'all';
  salonId?: string | 'all';
  employeeId?: string | 'all';
  text?: string; // búsqueda por cliente/servicio
}

type TurnosState = {
  appointments: Turno[];
  loading: boolean;
  filters: TurnosFilters;
  selectedSalon: string | null;
  lastSyncedAt: number | null;
};

type TurnosActions = {
  setAll: (list: Turno[]) => void;
  upsert: (turno: Turno) => void;
  remove: (id: string) => void;
  updateStatus: (id: string, status: AppointmentStatus) => void;
  setFilters: (filters: Partial<TurnosFilters>) => void;
  setSelectedSalon: (salonId: string | null) => void;
  setLoading: (loading: boolean) => void;
};

type TurnosSelectors = {
  getByDate: (fecha: string) => Turno[];
  getByStatus: (status: AppointmentStatus) => Turno[];
  getBySalon: (salonId: string) => Turno[];
  getByEmployee: (employeeId: string) => Turno[];
  getFiltered: () => Turno[];
};

type TurnosValidations = {
  validateTurno: (turno: Partial<Turno>, employees: Employee[], salonAssignments: SalonEmployee[], orgId: string) => { valid: boolean; error_code?: string; message?: string };
  checkConflicts: (turno: Partial<Turno>, excludeId?: string, getServiceDuration?: (serviceId: string, salonId: string) => number | null) => { valid: boolean; conflict?: Turno; message?: string };
  validateEmployeeInSalon: (employeeId: string, salonId: string, salonAssignments: SalonEmployee[]) => { valid: boolean; error_code?: string; message?: string };
  validateEmployeeActive: (employeeId: string, employees: Employee[], orgId: string) => { valid: boolean; error_code?: string; message?: string };
};

export type TurnosStore = TurnosState & TurnosActions & TurnosSelectors & TurnosValidations;

// Estado global
const state: TurnosState = {
  appointments: [],
  loading: false,
  filters: {},
  selectedSalon: null,
  lastSyncedAt: null,
};

// Suscriptores para notificar cambios
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => {
    try { fn(); } catch {}
  });
}

// Selectores puros
function sameDay(dateStr: string, base: Date): boolean {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.getFullYear() === base.getFullYear() && 
         d.getMonth() === base.getMonth() && 
         d.getDate() === base.getDate();
}

function getByDate(fecha: string): Turno[] {
  const fechaDate = new Date(`${fecha}T00:00:00`);
  return state.appointments.filter(apt => sameDay(apt.date, fechaDate));
}

function getByStatus(status: AppointmentStatus): Turno[] {
  return state.appointments.filter(apt => apt.status === status);
}

function getBySalon(salonId: string): Turno[] {
  return state.appointments.filter(apt => apt.salonId === salonId);
}

function getByEmployee(employeeId: string): Turno[] {
  return state.appointments.filter(apt => apt.stylist === employeeId);
}

function getFiltered(): Turno[] {
  let filtered = [...state.appointments];

  // Filtrar por salón
  if (state.filters.salonId && state.filters.salonId !== 'all') {
    filtered = filtered.filter(apt => apt.salonId === state.filters.salonId);
  }

  // Filtrar por estado
  if (state.filters.status && state.filters.status !== 'all') {
    filtered = filtered.filter(apt => apt.status === state.filters.status);
  }

  // Filtrar por empleado
  if (state.filters.employeeId && state.filters.employeeId !== 'all') {
    filtered = filtered.filter(apt => apt.stylist === state.filters.employeeId);
  }

  // Filtrar por fecha
  if (state.filters.date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (state.filters.date === 'today') {
      filtered = filtered.filter(apt => sameDay(apt.date, today));
    } else if (state.filters.date === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      filtered = filtered.filter(apt => sameDay(apt.date, tomorrow));
    } else if (state.filters.date === 'week') {
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      filtered = filtered.filter(apt => {
        const aptDate = new Date(`${apt.date}T00:00:00`);
        return aptDate >= today && aptDate <= weekFromNow;
      });
    } else if (state.filters.date === 'month') {
      const monthFromNow = new Date(today);
      monthFromNow.setMonth(monthFromNow.getMonth() + 1);
      filtered = filtered.filter(apt => {
        const aptDate = new Date(`${apt.date}T00:00:00`);
        return aptDate >= today && aptDate <= monthFromNow;
      });
    } else {
      // Fecha específica YYYY-MM-DD
      filtered = filtered.filter(apt => apt.date === state.filters.date);
    }
  }

  // Filtrar por texto (cliente o servicio)
  if (state.filters.text) {
    const query = state.filters.text.toLowerCase();
    filtered = filtered.filter(apt => 
      apt.clientName.toLowerCase().includes(query) ||
      apt.service.toLowerCase().includes(query)
    );
  }

  return filtered;
}

// Validaciones
function validateTurno(
  turno: Partial<Turno>,
  employees: Employee[],
  salonAssignments: SalonEmployee[],
  orgId: string
): { valid: boolean; error_code?: string; message?: string } {
  // Validar datos mínimos
  if (!turno.salonId) {
    return { valid: false, error_code: 'MISSING_SALON', message: 'Debe especificar un salón' };
  }
  // Estilista es opcional - no validar si no está presente
  if (!turno.date || !turno.time) {
    return { valid: false, error_code: 'MISSING_DATETIME', message: 'Debe especificar fecha y hora' };
  }
  if (!turno.service) {
    return { valid: false, error_code: 'MISSING_SERVICE', message: 'Debe especificar un servicio' };
  }

  // Validar horario coherente
  try {
    const startsAt = new Date(`${turno.date}T${turno.time}:00`);
    if (isNaN(startsAt.getTime())) {
      return { valid: false, error_code: 'INVALID_DATETIME', message: 'Fecha u hora inválida' };
    }
  } catch {
    return { valid: false, error_code: 'INVALID_DATETIME', message: 'Fecha u hora inválida' };
  }

  // Validar empleado solo si está presente (es opcional)
  // Permitir valores undefined, null o string vacío sin validar
  if (turno.stylist && turno.stylist !== '' && turno.stylist !== null && turno.stylist !== undefined) {
    const employee = employees.find(e => e.id === turno.stylist);
    if (!employee) {
      return { 
        valid: false, 
        error_code: 'EMPLOYEE_NOT_FOUND', 
        message: `El empleado seleccionado no existe en el sistema` 
      };
    }

    const employeeValidation = validateEmployeeForAppointment(employee, orgId);
    if (!employeeValidation.valid) {
      return {
        ...employeeValidation,
        message: employeeValidation.message || 'El empleado no cumple con los requisitos para asignar turnos'
      };
    }

    // Validar que empleado está asignado al salón
    // Convertir SalonEmployee[] a formato esperado por validateEmployeeInSalon
    const assignmentsForValidation = salonAssignments.map(a => ({
      employee_id: a.employee_id,
      salon_id: a.salon_id,
      active: a.active,
    }));
    const inSalonValidation = validateEmployeeInSalon(turno.stylist, turno.salonId, assignmentsForValidation);
    if (!inSalonValidation.valid) {
      return { 
        valid: false, 
        error_code: 'EMPLOYEE_NOT_IN_SALON', 
        message: `El empleado "${employee.full_name || employee.email || turno.stylist}" no está asignado al salón seleccionado. Por favor, asigna el empleado al salón o selecciona otro empleado.` 
      };
    }
  }

  return { valid: true };
}

function checkConflicts(
  turno: Partial<Turno>,
  excludeId?: string,
  getServiceDuration?: (serviceId: string, salonId: string) => number | null
): { valid: boolean; conflict?: Turno; message?: string } {
  if (!turno.stylist || !turno.date || !turno.time) {
    return { valid: true }; // No se puede validar sin datos completos
  }

  try {
    const startsAt = new Date(`${turno.date}T${turno.time}:00`);
    if (isNaN(startsAt.getTime())) {
      return { valid: true }; // No se puede validar con fecha inválida
    }

    // Obtener duración del servicio - REQUERIDO en producción
    let durationMinutes: number | null = null;
    if (turno.service && turno.salonId && getServiceDuration) {
      durationMinutes = getServiceDuration(turno.service, turno.salonId);
    }
    
    // Si no se puede obtener la duración, no se puede validar conflictos
    if (durationMinutes === null || durationMinutes <= 0) {
      return { valid: true }; // Asumir válido si no se puede obtener duración (servicio no encontrado)
    }
    
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

    // Buscar turnos del mismo empleado en el mismo salón
    const sameEmployeeTurnos = state.appointments.filter(apt => 
      apt.stylist === turno.stylist && 
      apt.salonId === turno.salonId &&
      apt.id !== excludeId &&
      apt.status !== 'cancelled'
    );

    for (const existing of sameEmployeeTurnos) {
      try {
        const existingStarts = new Date(`${existing.date}T${existing.time}:00`);
        
        // Obtener duración del servicio existente - REQUERIDO en producción
        let existingDurationMinutes: number | null = null;
        if (existing.service && existing.salonId && getServiceDuration) {
          existingDurationMinutes = getServiceDuration(existing.service, existing.salonId);
        }
        
        // Si no se puede obtener la duración, saltar este turno
        if (existingDurationMinutes === null || existingDurationMinutes <= 0) {
          continue;
        }
        
        const existingEnds = new Date(existingStarts.getTime() + existingDurationMinutes * 60 * 1000);

        // Verificar solapamiento
        if ((startsAt >= existingStarts && startsAt < existingEnds) ||
            (endsAt > existingStarts && endsAt <= existingEnds) ||
            (startsAt <= existingStarts && endsAt >= existingEnds)) {
          const existingTime = existing.time;
          const existingDate = existing.date;
          return {
            valid: false,
            conflict: existing,
            message: `El empleado ya tiene un turno en ese horario (${existingDate} ${existingTime})`
          };
        }
      } catch {
        // Continuar con el siguiente turno si hay error en la fecha
        continue;
      }
    }

    return { valid: true };
  } catch {
    return { valid: true }; // Si hay error, asumir válido para no bloquear
  }
}

function validateEmployeeInSalonStore(
  employeeId: string,
  salonId: string,
  salonAssignments: SalonEmployee[]
): { valid: boolean; error_code?: string; message?: string } {
  // Convertir SalonEmployee[] a formato esperado por validateEmployeeInSalon
  const assignmentsForValidation = salonAssignments.map(a => ({
    employee_id: a.employee_id,
    salon_id: a.salon_id,
    active: a.active,
  }));
  return validateEmployeeInSalon(employeeId, salonId, assignmentsForValidation);
}

function validateEmployeeActiveStore(
  employeeId: string,
  employees: Employee[],
  orgId: string
): { valid: boolean; error_code?: string; message?: string } {
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) {
    return { valid: false, error_code: 'EMPLOYEE_NOT_FOUND', message: 'Empleado no encontrado' };
  }
  return validateEmployeeForAppointment(employee, orgId);
}

// Store exportado
export const turnosStore: TurnosStore = {
  ...state,
  
  // Acciones
  setAll(list) {
    const statusPriority = (status: AppointmentStatus) => {
      switch (status) {
        case 'confirmed':
          return 3;
        case 'completed':
          return 2;
        case 'pending':
          return 1;
        case 'cancelled':
        default:
          return 0;
      }
    };

    const byComposite = new Map<string, Turno>();

    for (const turno of list) {
      if (!turno) continue;

      const compositeKey = [
        turno.salonId || 'all',
        turno.date,
        turno.time,
        (turno.clientName || '').trim().toLowerCase(),
      ].join('|');

      const existing = byComposite.get(compositeKey);

      if (!existing) {
        byComposite.set(compositeKey, turno);
        continue;
      }

      if (!existing.id && turno.id) {
        byComposite.set(compositeKey, turno);
        continue;
      }

      if (existing.id && turno.id && existing.id === turno.id) {
        byComposite.set(compositeKey, turno);
        continue;
      }

      if (statusPriority(turno.status) > statusPriority(existing.status)) {
        byComposite.set(compositeKey, turno);
        continue;
      }

      if (
        statusPriority(turno.status) === statusPriority(existing.status) &&
        turno.id &&
        !existing.id
      ) {
        byComposite.set(compositeKey, turno);
      }
    }

    state.appointments = Array.from(byComposite.values());
    state.lastSyncedAt = Date.now();
    notify();
  },
  
  upsert(turno) {
    const idx = state.appointments.findIndex((a) => a.id === turno.id);
    if (idx === -1) {
      state.appointments = [turno, ...state.appointments];
    } else {
      const copy = state.appointments.slice();
      copy[idx] = { ...copy[idx], ...turno };
      state.appointments = copy;
    }
    state.lastSyncedAt = Date.now();
    notify();
  },
  
  remove(id) {
    state.appointments = state.appointments.filter((a) => a.id !== id);
    state.lastSyncedAt = Date.now();
    notify();
  },
  
  updateStatus(id, status) {
    const idx = state.appointments.findIndex((a) => a.id === id);
    if (idx !== -1) {
      const copy = state.appointments.slice();
      copy[idx] = { ...copy[idx], status };
      state.appointments = copy;
      state.lastSyncedAt = Date.now();
      notify();
    }
  },
  
  setFilters(filters) {
    state.filters = { ...state.filters, ...filters };
    notify();
  },
  
  setSelectedSalon(salonId) {
    state.selectedSalon = salonId;
    notify();
  },
  
  setLoading(loading) {
    state.loading = loading;
    notify();
  },
  
  // Selectores
  getByDate,
  getByStatus,
  getBySalon,
  getByEmployee,
  getFiltered,
  
  // Validaciones
  validateTurno,
  checkConflicts,
  validateEmployeeInSalon: validateEmployeeInSalonStore,
  validateEmployeeActive: validateEmployeeActiveStore,
};

// Función para suscribirse a cambios
export function subscribeTurnosStore(listener: () => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

