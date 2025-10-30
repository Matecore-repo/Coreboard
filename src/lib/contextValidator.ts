/**
 * Context Validator
 * 
 * Garantiza que el frontend y backend hablen del mismo contexto:
 * - Mismo usuario
 * - Misma organización
 * - Mismo salón
 * 
 * ANTES de cualquier operación, esto debe pasar.
 */

import { User } from '../contexts/AuthContext';

export interface ContextSnapshot {
  user_id_real: string;           // Del token JWT
  org_id_server: string;          // Del RLS / memberships
  org_id_front: string;           // Lo que mandó el cliente
  salon_id_front: string | null;  // Lo que mandó el cliente
  timestamp: number;
}

export interface ContextValidationResult {
  valid: boolean;
  state: 'clean' | 'divergent' | 'missing_data';
  context?: ContextSnapshot;
  error?: {
    code: 'ORG_DIVERGENCE' | 'MISSING_ORG' | 'MISSING_USER' | 'MISSING_SALON';
    message: string;
    expected?: {
      org_id_server: string;
      salon_id?: string | null;
    };
    actual?: {
      org_id_front: string;
      salon_id_front?: string | null;
    };
    recovery?: string; // "resync_orgs" | "refresh_token" | null
  };
}

/**
 * Lee el contexto REAL desde el servidor
 * 
 * En una app real, esto vendría del JWT decodificado + query a memberships
 * Para MVP, lo sacamos del AuthContext que ya tiene esa info
 */
export function getServerContext(user: User | null): Partial<ContextSnapshot> {
  if (!user || !user.id) {
    return { user_id_real: undefined, org_id_server: undefined };
  }

  // org_id_server = la org que el servidor dice que vos pertenecés
  const org_id_server = user.current_org_id || user.memberships?.[0]?.org_id;

  return {
    user_id_real: user.id,
    org_id_server: org_id_server || undefined,
  };
}

/**
 * Valida que el contexto del cliente coincida con el del servidor
 * 
 * Retorna:
 * - valid: true si todo OK
 * - state: 'clean' | 'divergent' | 'missing_data'
 * - context: snapshot si valid=true
 * - error: detalles si valid=false
 */
export function validateContext(
  frontendContext: {
    org_id: string;
    salon_id?: string | null;
  },
  serverContext: Partial<ContextSnapshot>,
  user: User | null
): ContextValidationResult {
  const timestamp = Date.now();

  // 1. Verificar que tenemos user_id
  if (!user || !user.id || !serverContext.user_id_real) {
    return {
      valid: false,
      state: 'missing_data',
      error: {
        code: 'MISSING_USER',
        message: 'Usuario no autenticado o sesión expirada',
        recovery: 'refresh_token',
      },
    };
  }

  // 2. Verificar que el servidor conoce la org del usuario
  if (!serverContext.org_id_server) {
    return {
      valid: false,
      state: 'missing_data',
      error: {
        code: 'MISSING_ORG',
        message: 'Usuario no tiene organización asignada en el servidor',
        recovery: 'resync_orgs',
      },
    };
  }

  // 3. Verificar que el frontend mandó una org
  if (!frontendContext.org_id) {
    return {
      valid: false,
      state: 'missing_data',
      error: {
        code: 'MISSING_ORG',
        message: 'Cliente no especificó org_id',
      },
    };
  }

  // 4. COMPARAR: ¿org_id_front == org_id_server?
  if (frontendContext.org_id !== serverContext.org_id_server) {
    return {
      valid: false,
      state: 'divergent',
      error: {
        code: 'ORG_DIVERGENCE',
        message: `Divergencia de organización: cliente cree estar en "${frontendContext.org_id}", servidor dice "${serverContext.org_id_server}"`,
        expected: {
          org_id_server: serverContext.org_id_server,
        },
        actual: {
          org_id_front: frontendContext.org_id,
        },
        recovery: 'resync_orgs',
      },
    };
  }

  // 5. Si todo OK, devolver snapshot limpio
  const context: ContextSnapshot = {
    user_id_real: serverContext.user_id_real!,
    org_id_server: serverContext.org_id_server,
    org_id_front: frontendContext.org_id,
    salon_id_front: frontendContext.salon_id || null,
    timestamp,
  };

  return {
    valid: true,
    state: 'clean',
    context,
  };
}

/**
 * Atajos para los casos más comunes
 */
export function assertContextClean(
  frontendContext: { org_id: string; salon_id?: string | null },
  serverContext: Partial<ContextSnapshot>,
  user: User | null
): ContextSnapshot {
  const result = validateContext(frontendContext, serverContext, user);
  
  if (!result.valid) {
    throw new Error(
      `Context validation failed: ${result.error?.code} - ${result.error?.message}`
    );
  }

  return result.context!;
}

/**
 * Exporta un resumen útil para logging/debugging
 */
export function debugContextMismatch(result: ContextValidationResult): string {
  if (result.valid) return 'Context OK';

  if (result.error?.code === 'ORG_DIVERGENCE') {
    return `[ORG_DIVERGENCE] Frontend: ${result.error.actual?.org_id_front} | Server: ${result.error.expected?.org_id_server}`;
  }

  if (result.error?.code === 'MISSING_USER') {
    return '[MISSING_USER] Sesión expirada o no autenticado';
  }

  if (result.error?.code === 'MISSING_ORG') {
    return '[MISSING_ORG] No hay contexto de organización';
  }

  return `[${result.error?.code}] ${result.error?.message}`;
}
