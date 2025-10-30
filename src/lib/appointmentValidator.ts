/**
 * Appointment Validator
 * 
 * Valida que un turno cumpla TODAS las reglas de negocio antes de crearse.
 * 
 * Orden de validación:
 * 1. Salón pertenece a org
 * 2. Servicio pertenece al salón
 * 3. Empleado puede trabajar en el salón
 * 4. Empleado hace ese servicio
 * 5. Salón abre ese día/hora
 * 6. No hay conflicto horario con otro turno del empleado
 */

export interface AppointmentIntent {
  org_id: string;
  salon_id: string;
  client_id: string;
  client_name?: string;
  employee_id: string;
  service_id: string;
  starts_at: string; // ISO 8601: "2025-10-30T14:30:00"
  duration_minutes?: number;
  notes?: string;
}

export interface AppointmentValidationResult {
  valid: boolean;
  state: 'valid' | 'invalid';
  rule_failed?: string;
  message?: string;
  suggestions?: string[];
  normalized_appointment?: Partial<AppointmentIntent>;
  error_code?: 
    | 'SALON_NOT_IN_ORG'
    | 'SERVICE_NOT_IN_SALON'
    | 'EMPLOYEE_NOT_IN_SALON'
    | 'EMPLOYEE_CANT_DO_SERVICE'
    | 'SALON_CLOSED'
    | 'EMPLOYEE_CONFLICT'
    | 'INVALID_TIME_FORMAT'
    | 'MISSING_REQUIRED_FIELD';
}

/**
 * Mock data para MVP - en producción vendría de la BD
 */
interface MockSalon {
  id: string;
  org_id: string;
  name: string;
  opening_hours?: { [day: string]: { open: string; close: string } };
}

interface MockService {
  id: string;
  salon_id: string;
  name: string;
  duration_minutes: number;
}

interface MockEmployee {
  id: string;
  salon_id: string;
  name: string;
  services?: string[]; // service_ids
}

interface MockAppointment {
  employee_id: string;
  starts_at: string;
  duration_minutes: number;
}

/**
 * En MVP asumimos que estos datos se pasan o se obtienen de contexto
 * En prod, harías queries a la BD
 */
export class AppointmentValidator {
  private mockSalons: MockSalon[] = [];
  private mockServices: MockService[] = [];
  private mockEmployees: MockEmployee[] = [];
  private mockAppointments: MockAppointment[] = [];

  constructor(
    salons?: MockSalon[],
    services?: MockService[],
    employees?: MockEmployee[],
    appointments?: MockAppointment[]
  ) {
    this.mockSalons = salons || [];
    this.mockServices = services || [];
    this.mockEmployees = employees || [];
    this.mockAppointments = appointments || [];
  }

  validate(intent: AppointmentIntent): AppointmentValidationResult {
    // Validación 0: Campos requeridos
    if (!this.validateRequiredFields(intent)) {
      return {
        valid: false,
        state: 'invalid',
        error_code: 'MISSING_REQUIRED_FIELD',
        rule_failed: 'MISSING_REQUIRED_FIELD',
        message: 'Faltan campos requeridos (org_id, salon_id, employee_id, service_id, starts_at)',
      };
    }

    // Validación 1: Formato de fecha
    if (!this.isValidISODateTime(intent.starts_at)) {
      return {
        valid: false,
        state: 'invalid',
        error_code: 'INVALID_TIME_FORMAT',
        rule_failed: 'INVALID_TIME_FORMAT',
        message: `Formato de fecha inválido. Usa ISO 8601: "2025-10-30T14:30:00"`,
      };
    }

    // Validación 2: Salón pertenece a org
    const salon = this.mockSalons.find(s => s.id === intent.salon_id);
    if (!salon || salon.org_id !== intent.org_id) {
      return {
        valid: false,
        state: 'invalid',
        error_code: 'SALON_NOT_IN_ORG',
        rule_failed: 'SALON_NOT_IN_ORG',
        message: `Salón "${intent.salon_id}" no pertenece a la organización "${intent.org_id}"`,
      };
    }

    // Validación 3: Servicio pertenece al salón
    const service = this.mockServices.find(
      s => s.id === intent.service_id && s.salon_id === intent.salon_id
    );
    if (!service) {
      return {
        valid: false,
        state: 'invalid',
        error_code: 'SERVICE_NOT_IN_SALON',
        rule_failed: 'SERVICE_NOT_IN_SALON',
        message: `Servicio "${intent.service_id}" no existe en el salón "${intent.salon_id}"`,
      };
    }

    // Validación 4: Empleado pertenece al salón
    const employee = this.mockEmployees.find(e => e.id === intent.employee_id && e.salon_id === intent.salon_id);
    if (!employee) {
      return {
        valid: false,
        state: 'invalid',
        error_code: 'EMPLOYEE_NOT_IN_SALON',
        rule_failed: 'EMPLOYEE_NOT_IN_SALON',
        message: `Empleado "${intent.employee_id}" no trabaja en el salón "${intent.salon_id}"`,
      };
    }

    // Validación 5: Empleado hace ese servicio
    if (employee.services && !employee.services.includes(intent.service_id)) {
      return {
        valid: false,
        state: 'invalid',
        error_code: 'EMPLOYEE_CANT_DO_SERVICE',
        rule_failed: 'EMPLOYEE_CANT_DO_SERVICE',
        message: `Empleado "${employee.name}" no está capacitado para hacer "${service.name}"`,
        suggestions: [
          `Asigna a otro empleado que haga "${service.name}"`,
          `Agrega "${service.name}" a las habilidades de ${employee.name}`,
        ],
      };
    }

    // Validación 6: Salón está abierto ese día/hora
    const openingValidation = this.validateSalonOpeningHours(salon, intent.starts_at);
    if (!openingValidation.valid) {
      return {
        valid: false,
        state: 'invalid',
        error_code: 'SALON_CLOSED',
        rule_failed: 'SALON_CLOSED',
        message: openingValidation.message,
        suggestions: openingValidation.suggestions,
      };
    }

    // Validación 7: No hay conflicto horario
    const duration = intent.duration_minutes || service.duration_minutes || 30;
    const conflictValidation = this.validateEmployeeAvailability(
      intent.employee_id,
      intent.starts_at,
      duration
    );
    if (!conflictValidation.valid) {
      return {
        valid: false,
        state: 'invalid',
        error_code: 'EMPLOYEE_CONFLICT',
        rule_failed: 'EMPLOYEE_CONFLICT',
        message: conflictValidation.message,
        suggestions: conflictValidation.suggestions,
      };
    }

    // ✅ TODO PASÓ
    const normalized: Partial<AppointmentIntent> = {
      org_id: intent.org_id,
      salon_id: intent.salon_id,
      client_id: intent.client_id,
      client_name: intent.client_name || `Cliente ${intent.client_id}`,
      employee_id: intent.employee_id,
      service_id: intent.service_id,
      starts_at: intent.starts_at,
      duration_minutes: duration,
      notes: intent.notes || '',
    };

    return {
      valid: true,
      state: 'valid',
      normalized_appointment: normalized,
    };
  }

  private validateRequiredFields(intent: AppointmentIntent): boolean {
    return !!(
      intent.org_id &&
      intent.salon_id &&
      intent.employee_id &&
      intent.service_id &&
      intent.starts_at
    );
  }

  private isValidISODateTime(dateString: string): boolean {
    try {
      const date = new Date(dateString);
      return !isNaN(date.getTime()) && dateString.includes('T');
    } catch {
      return false;
    }
  }

  private validateSalonOpeningHours(
    salon: MockSalon,
    startsAt: string
  ): { valid: boolean; message?: string; suggestions?: string[] } {
    // Si el salón no tiene horario definido, asumir que está abierto
    if (!salon.opening_hours) {
      return { valid: true };
    }

    const date = new Date(startsAt);
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
      date.getDay()
    ];
    const hours = salon.opening_hours[dayName];

    if (!hours) {
      return {
        valid: false,
        message: `El salón "${salon.name}" no abre los ${dayName}s`,
        suggestions: [`Elige un día que el salón esté abierto`],
      };
    }

    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    if (timeStr < hours.open || timeStr > hours.close) {
      return {
        valid: false,
        message: `El horario ${timeStr} está fuera del horario del salón (${hours.open}-${hours.close})`,
        suggestions: [`Elige entre ${hours.open} y ${hours.close}`],
      };
    }

    return { valid: true };
  }

  private validateEmployeeAvailability(
    employeeId: string,
    startsAt: string,
    durationMinutes: number
  ): { valid: boolean; message?: string; suggestions?: string[] } {
    const requestStart = new Date(startsAt).getTime();
    const requestEnd = requestStart + durationMinutes * 60 * 1000;

    for (const existing of this.mockAppointments) {
      if (existing.employee_id !== employeeId) continue;

      const existingStart = new Date(existing.starts_at).getTime();
      const existingEnd = existingStart + existing.duration_minutes * 60 * 1000;

      // ¿Hay overlap?
      if (requestStart < existingEnd && requestEnd > existingStart) {
        return {
          valid: false,
          message: `Conflicto horario: el empleado ya tiene turno desde ${existing.starts_at}`,
          suggestions: [
            `Mueve el turno a otra franja horaria`,
            `Asigna a otro empleado`,
          ],
        };
      }
    }

    return { valid: true };
  }
}

/**
 * Atajos de uso común
 */
export function validateAppointment(
  intent: AppointmentIntent,
  validator?: AppointmentValidator
): AppointmentValidationResult {
  const v = validator || new AppointmentValidator();
  return v.validate(intent);
}

export function assertAppointmentValid(intent: AppointmentIntent): AppointmentIntent {
  const result = validateAppointment(intent);
  if (!result.valid) {
    throw new Error(
      `Appointment validation failed: [${result.error_code}] ${result.message}`
    );
  }
  return result.normalized_appointment as AppointmentIntent;
}
