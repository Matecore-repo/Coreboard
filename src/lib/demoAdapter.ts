/**
 * Demo Adapter
 * 
 * El demo NO miente. Aplica las mismas validaciones que el real,
 * solo que persiste en demoStore en lugar de Supabase.
 * 
 * Objetivo: que lo que funciona en demo también funcione en prod.
 */

import { OperationValidationResult } from './operationValidator';
import { AppointmentIntent } from './appointmentValidator';
import { demoStore } from '../demo/store';
import { User } from '../contexts/AuthContext';
import { validateCreateAppointment } from './operationValidator';

export interface DemoAdapterOptions {
  operation: string;
  payload: any;
  context: {
    user: User | null;
    isDemo: boolean;
  };
}

export interface DemoAdapterResult {
  status: OperationValidationResult['status'];
  warning?: string;
  demo_warning?: 'DEMO_SECURITY_LIGHTER';
  payload?: any;
  message?: string;
  error_code?: string;
}

/**
 * Adapta una operación para ejecutarse en demo con validaciones idénticas a real
 */
export async function adaptDemoOperation(
  options: DemoAdapterOptions
): Promise<DemoAdapterResult> {
  const { operation, payload, context } = options;
  const { user, isDemo } = context;

  if (!isDemo) {
    // No es demo, pasar directo
    return {
      status: 'valido',
      payload,
    };
  }

  // En modo demo, aplicar validaciones IGUALES a real
  switch (operation) {
    case 'create_appointment':
      return validateAndPersistAppointmentDemo(payload as AppointmentIntent, user);

    case 'update_appointment':
      // TODO: Implementar
      return {
        status: 'invalido',
        error_code: 'NOT_IMPLEMENTED',
        message: 'update_appointment en demo no implementado',
      };

    case 'delete_appointment':
      // TODO: Implementar
      return {
        status: 'invalido',
        error_code: 'NOT_IMPLEMENTED',
        message: 'delete_appointment en demo no implementado',
      };

    default:
      return {
        status: 'invalido',
        error_code: 'UNKNOWN_OPERATION',
        message: `Operación desconocida: ${operation}`,
      };
  }
}

/**
 * Valida y persiste un turno en modo demo
 * 
 * CRÍTICO: Usa exactamente las mismas validaciones que el real
 */
async function validateAndPersistAppointmentDemo(
  intent: AppointmentIntent,
  user: User | null
): Promise<DemoAdapterResult> {
  // Paso 1: Validar usando el MISMO validador que en real
  const validation = validateCreateAppointment(intent, user);

  // Si algo falla, retornar el error tal cual
  if (validation.status !== 'valido') {
    return {
      status: validation.status,
      error_code: validation.error_code,
      message: validation.message,
      payload: null,
    };
  }

  // Paso 2: Todo validó OK
  // En real, irías a Supabase. En demo, vamos a demoStore.

  try {
    // Persistir en demo store
    const result = await demoStore.appointments.create({
      org_id: intent.org_id,
      salon_id: intent.salon_id,
      client_name: intent.client_name || `Cliente ${intent.client_id}`,
      service_id: intent.service_id,
      stylist_id: intent.employee_id,
      starts_at: intent.starts_at,
      status: 'pending',
      notes: intent.notes,
    });

    // ✅ OK
    // Pero agregar advertencia: en real hay RLS que en demo no está
    return {
      status: 'valido',
      demo_warning: 'DEMO_SECURITY_LIGHTER',
      warning: 'Modo demo: Las validaciones son las mismas, pero RLS no está activo. En producción puede haber restricciones adicionales.',
      payload: result,
    };
  } catch (error: any) {
    return {
      status: 'invalido',
      error_code: 'DEMO_STORE_ERROR',
      message: `Error al persistir en demo: ${error.message}`,
    };
  }
}

/**
 * Helper: ¿Estamos en modo demo?
 */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

/**
 * Entrypoint recomendado
 *
 * Uso:
 *
 * const result = await executeOperationWithDemoFallback({
 *   operation: 'create_appointment',
 *   payload: appointmentIntent,
 *   user,
 *   onRealExecute: async (validatedPayload) => {
 *     return await supabase.from('appointments').insert(validatedPayload);
 *   }
 * });
 */
export async function executeOperationWithDemoFallback(options: {
  operation: string;
  payload: any;
  user: User | null;
  onRealExecute: (payload: any) => Promise<any>;
}): Promise<DemoAdapterResult> {
  const { operation, payload, user, onRealExecute } = options;
  const isDemo = isDemoMode();

  if (isDemo) {
    // Modo demo: adaptar y ejecutar en demo
    return await adaptDemoOperation({
      operation,
      payload,
      context: { user, isDemo: true },
    });
  }

  // Modo real: validar y ejecutar en BD
  const validation = validateCreateAppointment(payload as AppointmentIntent, user);

  if (validation.status !== 'valido') {
    return {
      status: validation.status,
      error_code: validation.error_code,
      message: validation.message,
    };
  }

  try {
    const result = await onRealExecute(validation.payload);
    return {
      status: 'valido',
      payload: result,
    };
  } catch (error: any) {
    return {
      status: 'invalido',
      error_code: 'DB_ERROR',
      message: `Error en base de datos: ${error.message}`,
    };
  }
}

/**
 * Debug helper
 */
export function formatDemoResult(result: DemoAdapterResult): string {
  const lines: string[] = [];
  lines.push(`[${result.status.toUpperCase()}]`);

  if (result.demo_warning) {
    lines.push(`⚠️ ADVERTENCIA DEMO: ${result.demo_warning}`);
    lines.push(`   Las validaciones son idénticas a real, pero RLS no está activo`);
  }

  if (result.warning) {
    lines.push(`ℹ️ ${result.warning}`);
  }

  if (result.error_code) lines.push(`Error: ${result.error_code}`);
  if (result.message) lines.push(`Mensaje: ${result.message}`);

  return lines.join('\n');
}
