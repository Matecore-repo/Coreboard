/**
 * Context State Manager
 * 
 * Detecta cambios de salon_id y maneja el estado transitorio.
 * Bloquea operaciones mientras los recursos no estén sincronizados.
 */

export type ContextState = 'idle' | 'updating' | 'error';

export interface ContextStateSnapshot {
  state: ContextState;
  current_salon_id: string | null;
  previous_salon_id: string | null;
  resources_synced: Set<string>;
  resources_required: Set<string>;
  last_updated: number;
}

export interface StateCheckResult {
  can_operate: boolean;
  state: ContextState;
  reason?: string;
  resources_pending?: string[];
}

export const REQUIRED_RESOURCES = [
  'appointments',
  'clients',
  'employees',
  'salon_services',
] as const;

export class ContextStateManager {
  private currentState: ContextStateSnapshot;

  constructor() {
    this.currentState = {
      state: 'idle',
      current_salon_id: null,
      previous_salon_id: null,
      resources_synced: new Set(),
      resources_required: new Set(REQUIRED_RESOURCES),
      last_updated: Date.now(),
    };
  }

  /**
   * Notifica que el salón cambió
   * Cambia estado a "updating" y marca todos los recursos como no sincronizados
   */
  notifySalonChange(new_salon_id: string | null): void {
    if (new_salon_id === this.currentState.current_salon_id) {
      // No es un cambio real
      return;
    }

    this.currentState.previous_salon_id = this.currentState.current_salon_id;
    this.currentState.current_salon_id = new_salon_id;
    this.currentState.state = 'updating';
    this.currentState.resources_synced.clear();
    this.currentState.last_updated = Date.now();
  }

  /**
   * Notifica que un recurso está sincronizado
   * Cuando todos estén, cambia estado a "idle"
   */
  notifyResourceSynced(resource_name: string): void {
    this.currentState.resources_synced.add(resource_name);

    if (this.isFullySynced()) {
      this.currentState.state = 'idle';
    }
  }

  /**
   * Notifica que hubo un error
   * Cambia estado a "error"
   */
  notifyError(): void {
    this.currentState.state = 'error';
  }

  /**
   * Chequea si se puede ejecutar una operación
   */
  canOperate(): StateCheckResult {
    // En error, no operar
    if (this.currentState.state === 'error') {
      return {
        can_operate: false,
        state: 'error',
        reason: 'Estado de error. Recarga la página.',
      };
    }

    // Si está updating, no operar
    if (this.currentState.state === 'updating') {
      const pending = this.getPendingResources();
      return {
        can_operate: false,
        state: 'updating',
        reason: `Se está cambiando de salón. Espera a que se sincronicen: ${pending.join(', ')}`,
        resources_pending: pending,
      };
    }

    // Si está idle, operar
    return {
      can_operate: true,
      state: 'idle',
    };
  }

  /**
   * Chequea si está completamente sincronizado
   */
  private isFullySynced(): boolean {
    for (const resource of this.currentState.resources_required) {
      if (!this.currentState.resources_synced.has(resource)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Devuelve lista de recursos pendientes
   */
  private getPendingResources(): string[] {
    return Array.from(this.currentState.resources_required).filter(
      r => !this.currentState.resources_synced.has(r)
    );
  }

  /**
   * Devuelve snapshot del estado actual (para debugging)
   */
  getSnapshot(): ContextStateSnapshot {
    return {
      ...this.currentState,
      resources_synced: new Set(this.currentState.resources_synced),
      resources_required: new Set(this.currentState.resources_required),
    };
  }

  /**
   * Reseta el estado (útil para logout o reinicio)
   */
  reset(): void {
    this.currentState = {
      state: 'idle',
      current_salon_id: null,
      previous_salon_id: null,
      resources_synced: new Set(),
      resources_required: new Set(REQUIRED_RESOURCES),
      last_updated: Date.now(),
    };
  }

  /**
   * Helpers para debugging
   */
  debug(): string {
    const snapshot = this.getSnapshot();
    const pending = Array.from(snapshot.resources_required).filter(
      r => !snapshot.resources_synced.has(r)
    );

    return `
[ContextStateManager]
- State: ${snapshot.state}
- Current salon: ${snapshot.current_salon_id}
- Synced resources: ${Array.from(snapshot.resources_synced).join(', ') || 'none'}
- Pending: ${pending.join(', ') || 'none'}
- Last updated: ${new Date(snapshot.last_updated).toISOString()}
    `.trim();
  }
}

/**
 * Singleton global para la app
 */
let globalStateManager: ContextStateManager | null = null;

export function getContextStateManager(): ContextStateManager {
  if (!globalStateManager) {
    globalStateManager = new ContextStateManager();
  }
  return globalStateManager;
}

export function resetContextStateManager(): void {
  globalStateManager = null;
}
