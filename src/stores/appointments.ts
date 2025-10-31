// Store global minimalista sin dependencias externas

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface AppointmentLite {
  id: string;
  clientName: string;
  service: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  stylist: string;
  salonId: string;
}

type AppointmentsState = {
  appointments: AppointmentLite[];
  loading: boolean;
  lastSyncedAt: number | null;
};

type AppointmentsActions = {
  setAll: (list: AppointmentLite[]) => void;
  upsert: (apt: AppointmentLite) => void;
  remove: (id: string) => void;
  updateStatus: (id: string, status: AppointmentStatus) => void;
};

export type AppointmentsStore = AppointmentsState & AppointmentsActions;

// Implementación minimalista de store sin dependencias externas (Context-less singleton)
// Evita añadir Zustand; expone funciones y un hook selector ligero con memo.

const state: AppointmentsState = {
  appointments: [],
  loading: false,
  lastSyncedAt: null,
};

const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => {
    try { fn(); } catch {}
  });
}

export const appointmentsStore: AppointmentsStore = {
  ...state,
  setAll(list) {
    state.appointments = list;
    state.lastSyncedAt = Date.now();
    notify();
  },
  upsert(apt) {
    const idx = state.appointments.findIndex((a) => a.id === apt.id);
    if (idx === -1) {
      state.appointments = [apt, ...state.appointments];
    } else {
      const copy = state.appointments.slice();
      copy[idx] = { ...copy[idx], ...apt };
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
};

export function subscribeAppointmentsStore(listener: () => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

// Selectores puros
function sameDay(dateStr: string, base: Date): boolean {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.getFullYear() === base.getFullYear() && d.getMonth() === base.getMonth() && d.getDate() === base.getDate();
}

export function pendingTodayCountSelector(list: AppointmentLite[], salonId?: string | null): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return list.filter((a) => a.status === 'pending' && (!salonId || salonId === 'all' || a.salonId === salonId) && sameDay(a.date, today)).length;
}

export function countsByStatusSelector(list: AppointmentLite[], salonId?: string | null): Record<AppointmentStatus, number> {
  const init: Record<AppointmentStatus, number> = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
  return list.reduce((acc, a) => {
    if (!salonId || salonId === 'all' || a.salonId === salonId) acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, init);
}

export function countsBySalonSelector(list: AppointmentLite[]): Record<string, { total: number; pending: number }> {
  const res: Record<string, { total: number; pending: number }> = {};
  for (const a of list) {
    if (!res[a.salonId]) res[a.salonId] = { total: 0, pending: 0 };
    res[a.salonId].total += 1;
    if (a.status === 'pending') res[a.salonId].pending += 1;
  }
  return res;
}

export function nextAppointmentSelector(list: AppointmentLite[], salonId?: string | null): AppointmentLite | null {
  const now = new Date();
  const future = list
    .filter((a) => !salonId || salonId === 'all' || a.salonId === salonId)
    .map((a) => ({ a, ts: new Date(`${a.date}T${a.time}:00`).getTime() }))
    .filter(({ ts }) => ts >= now.getTime())
    .sort((x, y) => x.ts - y.ts);
  return future.length ? future[0].a : null;
}

// Hook selector liviano
// Nota: los componentes pueden usar `subscribeAppointmentsStore` para reaccionar
// o derivar contadores con `useMemo` a partir de `appointmentsStore.appointments`.


