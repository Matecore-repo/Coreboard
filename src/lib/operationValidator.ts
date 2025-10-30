/**
 * Operation Validator - Orquestador Central
 * 
 * Integra: Contexto + Estado + Permisos + Validación de Negocio
 * 
 * Ante cualquier operación (create/update/delete), esto decide:
 * ✅ valido → puede ir a la BD
 * ❌ invalido → rompió una regla de negocio
 * ⚠️ inconsistente → org del front ≠ org del server
 * ⏳ inconsistente-temporal → se está cambiando de salón
 * 🔒 rechazado-por-permisos → rol no autoriza
 */

import { User } from '../contexts/AuthContext';
import {
  validateContext,
  getServerContext,
  ContextSnapshot,
  ContextValidationResult,
} from './contextValidator';
import {
  AppointmentIntent,
  AppointmentValidator,
  AppointmentValidationResult,
} from './appointmentValidator';
import {
  getContextStateManager,
  StateCheckResult,
} from './contextStateManager';
import {
  checkPermission,
  OperationType,
  PermissionCheckResult,
} from './permissionResolver';

export type OperationStatus =
  | 'valido'
  | 'invalido'
  | 'inconsistente'
  | 'inconsistente-temporal'
  | 'rechazado-por-permisos';

export interface OperationValidationResult {
  status: OperationStatus;
  context?: ContextSnapshot;
  message?: string;
  error_code?: string;
  suggestions?: string[];
  recovery_action?: string;
  permission_check?: PermissionCheckResult;
  payload?: any;
}

/**
 * Orquestador principal
 */
export class OperationValidator {
  private appointmentValidator: AppointmentValidator;

  constructor(appointmentValidator?: AppointmentValidator) {
    this.appointmentValidator = appointmentValidator || new AppointmentValidator();
  }

  /**
   * Valida una operación de crear turno
   * 
   * Pasos EN ORDEN:
   * 1. Chequea contexto (org del front vs org del server)
   * 2. Chequea estado (¿se está cambiando de salón?)
   * 3. Chequea permisos (¿puede este rol hacer esto?)
   * 4. Valida negocio (salón, empleado, horario, etc)
   */
  validateCreateAppointment(
    appointment_intent: AppointmentIntent,
    user: User | null
  ): OperationValidationResult {
    // Paso 1: Contexto
    const serverContext = getServerContext(user);
    const contextValidation = validateContext(
      {
        org_id: appointment_intent.org_id,
        salon_id: appointment_intent.salon_id,
      },
      serverContext,
      user
    );

    if (!contextValidation.valid) {
      if (contextValidation.error?.code === 'ORG_DIVERGENCE') {
        return {
          status: 'inconsistente',
          error_code: 'ORG_DIVERGENCE',
          message: contextValidation.error.message,
          recovery_action: 'resync_orgs',
          suggestions: [
            `Recarga la página para sincronizar tu organización`,
            `Si el problema persiste, cierra sesión y vuelve a ingresar`,
          ],
        };
      }

      return {
        status: 'inconsistente',
        error_code: contextValidation.error?.code,
        message: contextValidation.error?.message,
        recovery_action: contextValidation.error?.recovery,
      };
    }

    // Paso 2: Estado
    const stateManager = getContextStateManager();
    const stateCheck = stateManager.canOperate();

    if (!stateCheck.can_operate) {
      if (stateCheck.state === 'updating') {
        return {
          status: 'inconsistente-temporal',
          error_code: 'STATE_UPDATING',
          message: stateCheck.reason,
          suggestions: [
            `Espera a que se carguen todos los datos`,
            `Recursos pendientes: ${stateCheck.resources_pending?.join(', ')}`,
          ],
          recovery_action: 'wait',
        };
      }

      return {
        status: 'inconsistente',
        error_code: 'STATE_ERROR',
        message: stateCheck.reason,
        recovery_action: 'reload',
      };
    }

    // Paso 3: Permisos
    const permissionCheck = checkPermission({
      user_id: user?.id || '',
      role: user?.memberships?.[0]?.role || 'viewer',
      operation: 'appointment.create.own_salon' as OperationType,
      scoped_org_id: serverContext.org_id_server || '',
      scoped_salon_id: appointment_intent.salon_id,
      resource_salon_id: appointment_intent.salon_id,
    });

    if (!permissionCheck.permitted) {
      return {
        status: 'rechazado-por-permisos',
        error_code: permissionCheck.reason,
        message: `Rol ${permissionCheck.role} no autoriza: ${permissionCheck.operation}`,
        permission_check: permissionCheck,
        suggestions: [
          `Contacta al administrador para que te conceda permisos`,
          `Cambia de rol en la organización`,
        ],
      };
    }

    // Paso 4: Validación de negocio
    const appointmentValidation = this.appointmentValidator.validate(appointment_intent);

    if (!appointmentValidation.valid) {
      return {
        status: 'invalido',
        error_code: appointmentValidation.error_code,
        message: appointmentValidation.message,
        suggestions: appointmentValidation.suggestions,
        payload: null,
      };
    }

    // ✅ TODO OK
    return {
      status: 'valido',
      context: contextValidation.context,
      permission_check: permissionCheck,
      payload: appointmentValidation.normalized_appointment,
    };
  }

  /**
   * Atajo para operaciones genéricas
   */
  validateOperation(
    operation: 'create_appointment' | 'update_appointment' | 'delete_appointment',
    payload: any,
    user: User | null
  ): OperationValidationResult {
    switch (operation) {
      case 'create_appointment':
        return this.validateCreateAppointment(payload as AppointmentIntent, user);
      case 'update_appointment':
        // TODO: Implementar similar a create
        throw new Error('update_appointment no implementado');
      case 'delete_appointment':
        // TODO: Implementar similar a create
        throw new Error('delete_appointment no implementado');
      default:
        return {
          status: 'invalido',
          error_code: 'UNKNOWN_OPERATION',
          message: `Operación desconocida: ${operation}`,
        };
    }
  }
}

/**
 * Singleton global
 */
let globalValidator: OperationValidator | null = null;

export function getOperationValidator(): OperationValidator {
  if (!globalValidator) {
    globalValidator = new OperationValidator();
  }
  return globalValidator;
}

/**
 * Atajos para uso directo
 */
export function validateCreateAppointment(
  intent: AppointmentIntent,
  user: User | null
): OperationValidationResult {
  return getOperationValidator().validateCreateAppointment(intent, user);
}

/**
 * Assert - lanza error si no es válido
 */
export function assertOperationValid(result: OperationValidationResult): void {
  if (result.status !== 'valido') {
    throw new Error(
      `Operation validation failed [${result.status}]: ${result.message || result.error_code}`
    );
  }
}

/**
 * Debug helper
 */
export function formatValidationResult(result: OperationValidationResult): string {
  const lines: string[] = [];
  lines.push(`[${result.status.toUpperCase()}]`);

  if (result.error_code) lines.push(`Error: ${result.error_code}`);
  if (result.message) lines.push(`Message: ${result.message}`);
  if (result.recovery_action) lines.push(`Recovery: ${result.recovery_action}`);
  if (result.permission_check) {
    lines.push(`Permiso: ${result.permission_check.permitted ? '✅' : '❌'}`);
    lines.push(`Razón permiso: ${result.permission_check.reason}`);
  }
  if (result.suggestions?.length) {
    lines.push(`Suggestions:`);
    result.suggestions.forEach(s => lines.push(`  - ${s}`));
  }

  return lines.join('\n');
}
