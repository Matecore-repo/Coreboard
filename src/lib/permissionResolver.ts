/**
 * Permission Resolver
 * 
 * Tabla de decisiones: (rol, operacion) → permitido o rechazado
 * 
 * NO es UI. NO adivina. Solo dice sí o no.
 * Todos los inputs vienen del servidor (contexto validado).
 */

export type UserRole = 'owner' | 'admin' | 'employee' | 'viewer';

export type OperationType =
  // Appointments
  | 'appointment.read.all'
  | 'appointment.read.own_salon'
  | 'appointment.create.own_salon'
  | 'appointment.update.own_salon'
  | 'appointment.update.all'
  | 'appointment.delete.own_salon'
  | 'appointment.delete.all'
  // Clients
  | 'client.read.all'
  | 'client.create'
  | 'client.update'
  | 'client.delete'
  // Employees
  | 'employee.read'
  | 'employee.create'
  | 'employee.update'
  | 'employee.delete'
  // Salons
  | 'salon.read'
  | 'salon.create'
  | 'salon.update'
  | 'salon.delete'
  // Finance
  | 'finance.read.own_salon'
  | 'finance.read.all'
  | 'finance.export'
  // Organization
  | 'org.read'
  | 'org.manage'
  | 'org.invite_user';

export interface PermissionCheckInput {
  user_id: string;
  role: UserRole;
  operation: OperationType;
  scoped_org_id: string; // Lo que el server dice que es válido
  scoped_salon_id?: string | null; // Lo que el server dice que es válido
  resource_salon_id?: string; // La que la operación quiere acceder (para comparar si es own_salon)
}

export interface PermissionCheckResult {
  permitted: boolean;
  role: UserRole;
  operation: OperationType;
  reason?: string;
  scoped_to?: {
    org_id: string;
    salon_id?: string | null;
  };
}

/**
 * Tabla de permisos por rol
 * 
 * Formato: rol → Set<operacion>
 * Para operaciones scopeadas (own_salon), se valida en la lógica
 */
const PERMISSION_MAP: Record<UserRole, Set<OperationType>> = {
  viewer: new Set([
    'appointment.read.all',
    'client.read.all',
    'salon.read',
    'org.read',
  ]),

  employee: new Set([
    // Turnos: puede leer y crear/actualizar solo en su salón
    'appointment.read.all',
    'appointment.create.own_salon',
    'appointment.update.own_salon',
    'appointment.delete.own_salon',
    // Clientes
    'client.read.all',
    'client.create',
    'client.update',
    // Finanzas: solo su salón
    'finance.read.own_salon',
    // Generales
    'salon.read',
    'org.read',
  ]),

  admin: new Set([
    // Turnos: puede hacer todo
    'appointment.read.all',
    'appointment.create.own_salon',
    'appointment.update.own_salon',
    'appointment.update.all',
    'appointment.delete.own_salon',
    'appointment.delete.all',
    // Clientes
    'client.read.all',
    'client.create',
    'client.update',
    'client.delete',
    // Empleados
    'employee.read',
    'employee.create',
    'employee.update',
    'employee.delete',
    // Salones
    'salon.read',
    'salon.create',
    'salon.update',
    'salon.delete',
    // Finanzas
    'finance.read.all',
    'finance.export',
    // Organización
    'org.read',
    'org.manage',
    'org.invite_user',
  ]),

  owner: new Set([
    // TODO: Owner tiene TODOS
    'appointment.read.all',
    'appointment.create.own_salon',
    'appointment.update.own_salon',
    'appointment.update.all',
    'appointment.delete.own_salon',
    'appointment.delete.all',
    'client.read.all',
    'client.create',
    'client.update',
    'client.delete',
    'employee.read',
    'employee.create',
    'employee.update',
    'employee.delete',
    'salon.read',
    'salon.create',
    'salon.update',
    'salon.delete',
    'finance.read.all',
    'finance.export',
    'org.read',
    'org.manage',
    'org.invite_user',
  ]),
};

/**
 * Operaciones que requieren validación de scope
 * Si la operación está en este set, comparamos resource vs scoped
 */
const SCOPED_OPERATIONS = new Set<OperationType>([
  'appointment.create.own_salon',
  'appointment.update.own_salon',
  'appointment.delete.own_salon',
  'finance.read.own_salon',
]);

/**
 * Resuelve si un rol puede hacer una operación
 */
export function checkPermission(input: PermissionCheckInput): PermissionCheckResult {
  const { user_id, role, operation, scoped_org_id, scoped_salon_id, resource_salon_id } = input;

  // Paso 1: ¿El rol tiene permiso para esta operación?
  const rolePermissions = PERMISSION_MAP[role];

  if (!rolePermissions || !rolePermissions.has(operation)) {
    return {
      permitted: false,
      role,
      operation,
      reason: `ROL_NO_AUTORIZA_OPERACION`,
      scoped_to: {
        org_id: scoped_org_id,
        salon_id: scoped_salon_id,
      },
    };
  }

  // Paso 2: Si es una operación scopeada (own_salon), validar que el recurso es del salon valido
  if (SCOPED_OPERATIONS.has(operation)) {
    // Si la operación necesita un salon_id específico, comparar
    if (resource_salon_id && resource_salon_id !== scoped_salon_id) {
      return {
        permitted: false,
        role,
        operation,
        reason: `SALON_SCOPE_VIOLATION`,
        scoped_to: {
          org_id: scoped_org_id,
          salon_id: scoped_salon_id,
        },
      };
    }
  }

  // ✅ TODO OK
  return {
    permitted: true,
    role,
    operation,
    reason: 'OK',
    scoped_to: {
      org_id: scoped_org_id,
      salon_id: scoped_salon_id,
    },
  };
}

/**
 * Validador que lanza error si no tiene permiso
 */
export function assertPermitted(input: PermissionCheckInput): void {
  const result = checkPermission(input);

  if (!result.permitted) {
    throw new Error(
      `Permission denied [${result.role}]: ${result.operation} - ${result.reason}`
    );
  }
}

/**
 * Debug helper
 */
export function debugPermission(result: PermissionCheckResult): string {
  const status = result.permitted ? '✅ PERMITIDO' : '❌ RECHAZADO';
  const lines: string[] = [
    status,
    `Rol: ${result.role}`,
    `Operación: ${result.operation}`,
    `Razón: ${result.reason}`,
    `Scope org: ${result.scoped_to?.org_id}`,
    `Scope salon: ${result.scoped_to?.salon_id || 'ninguno'}`,
  ];
  return lines.join('\n');
}

/**
 * Lista todas las operaciones permitidas para un rol
 * (útil para generar UI)
 */
export function getPermittedOperations(role: UserRole): OperationType[] {
  return Array.from(PERMISSION_MAP[role] || new Set());
}

/**
 * Atajo para "puede este rol leer finanzas?"
 */
export function canReadFinances(role: UserRole, scope: 'own_salon' | 'all'): boolean {
  const permissions = PERMISSION_MAP[role];
  if (!permissions) return false;

  if (scope === 'own_salon') {
    return permissions.has('finance.read.own_salon');
  }

  return permissions.has('finance.read.all');
}

/**
 * Atajo para "puede este rol crear turnos?"
 */
export function canCreateAppointments(role: UserRole): boolean {
  const permissions = PERMISSION_MAP[role];
  if (!permissions) return false;
  return permissions.has('appointment.create.own_salon');
}

/**
 * Atajo para "puede este rol administrar la org?"
 */
export function canManageOrg(role: UserRole): boolean {
  const permissions = PERMISSION_MAP[role];
  if (!permissions) return false;
  return permissions.has('org.manage');
}
