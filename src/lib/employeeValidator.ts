/**
 * Employee Validator
 * 
 * Validaciones de modelo de empleados según la regla de oro:
 * - Empleado = Usuario autenticado dentro de una organización
 * - No existen empleados sin usuario
 * - user_id es obligatorio en app.employees
 */

import type { Employee } from '../hooks/useEmployees';

export interface EmployeeValidationResult {
  valid: boolean;
  error_code?: string;
  message?: string;
}

/**
 * Valida que un empleado tenga user_id obligatorio
 */
export function validateEmployeeHasUser(employee: Employee | Partial<Employee>): EmployeeValidationResult {
  if (!employee.user_id) {
    return {
      valid: false,
      error_code: 'EMPLOYEE_MISSING_USER_ID',
      message: 'El empleado debe tener un usuario asociado (user_id obligatorio)',
    };
  }
  return { valid: true };
}

/**
 * Valida que un empleado pertenezca a una organización
 */
export function validateEmployeeInOrg(employee: Employee | Partial<Employee>, orgId: string): EmployeeValidationResult {
  if (!employee.org_id) {
    return {
      valid: false,
      error_code: 'EMPLOYEE_MISSING_ORG_ID',
      message: 'El empleado debe tener una organización asociada',
    };
  }
  if (employee.org_id !== orgId) {
    return {
      valid: false,
      error_code: 'EMPLOYEE_NOT_IN_ORG',
      message: `El empleado pertenece a otra organización (${employee.org_id})`,
    };
  }
  return { valid: true };
}

/**
 * Valida que un empleado esté activo
 */
export function validateEmployeeActive(employee: Employee | Partial<Employee>): EmployeeValidationResult {
  if (employee.active === false) {
    return {
      valid: false,
      error_code: 'EMPLOYEE_INACTIVE',
      message: 'El empleado está inactivo',
    };
  }
  if (employee.deleted_at) {
    return {
      valid: false,
      error_code: 'EMPLOYEE_DELETED',
      message: 'El empleado fue eliminado',
    };
  }
  return { valid: true };
}

/**
 * Valida que un empleado esté asignado a un salón
 * Nota: Esta función no hace la consulta a BD, solo valida si el empleado
 * puede ser asignado. La verificación real se hace consultando salon_employees.
 */
export function validateEmployeeInSalon(
  employeeId: string,
  salonId: string,
  assignments: Array<{ employee_id: string; salon_id: string; active: boolean }>
): EmployeeValidationResult {
  const assignment = assignments.find(
    a => a.employee_id === employeeId && a.salon_id === salonId && a.active === true
  );
  
  if (!assignment) {
    return {
      valid: false,
      error_code: 'EMPLOYEE_NOT_IN_SALON',
      message: `El empleado no está asignado al salón ${salonId}`,
    };
  }
  return { valid: true };
}

/**
 * Valida todas las reglas de un empleado para uso en turnos
 */
export function validateEmployeeForAppointment(
  employee: Employee | null | undefined,
  orgId: string
): EmployeeValidationResult {
  if (!employee) {
    return {
      valid: false,
      error_code: 'EMPLOYEE_NOT_FOUND',
      message: 'Empleado no encontrado',
    };
  }

  // Validar user_id obligatorio
  const hasUserResult = validateEmployeeHasUser(employee);
  if (!hasUserResult.valid) {
    return hasUserResult;
  }

  // Validar que pertenece a la org
  const inOrgResult = validateEmployeeInOrg(employee, orgId);
  if (!inOrgResult.valid) {
    return inOrgResult;
  }

  // Validar que está activo
  const activeResult = validateEmployeeActive(employee);
  if (!activeResult.valid) {
    return activeResult;
  }

  return { valid: true };
}

/**
 * Filtra empleados que cumplen con las validaciones básicas
 */
export function filterValidEmployees(employees: Employee[]): Employee[] {
  return employees.filter(emp => {
    const result = validateEmployeeHasUser(emp);
    if (!result.valid) return false;
    
    const activeResult = validateEmployeeActive(emp);
    return activeResult.valid;
  });
}

