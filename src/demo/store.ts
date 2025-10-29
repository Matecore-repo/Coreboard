import { DEMO_ORG_ID, DEMO_USER_ID } from './constants';

type DemoSalon = {
  id: string;
  org_id: string;
  name: string;
  address: string;
  phone?: string;
  timezone?: string;
  active: boolean;
  deleted_at?: string | null;
};

type DemoService = {
  id: string;
  org_id: string;
  name: string;
  base_price: number;
  duration_minutes: number;
  active: boolean;
  deleted_at?: string | null;
};

type DemoSalonService = {
  id: string;
  salon_id: string;
  service_id: string;
  price_override: number | null;
  duration_override: number | null;
  active: boolean;
};

type DemoAppointment = {
  id: string;
  org_id: string;
  salon_id: string;
  service_id: string;
  stylist_id: string | null;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  starts_at: string;
  status: string;
  total_amount: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
};

type DemoClient = {
  id: string;
  org_id: string;
  full_name: string;
  phone?: string;
  email?: string;
  notes?: string;
  marketing_opt_in?: boolean;
  created_at: string;
};

type DemoEmployee = {
  id: string;
  org_id: string;
  user_id: string | null;
  full_name: string;
  email?: string;
  phone?: string;
  default_commission_pct: number;
  active: boolean;
  created_at: string;
  updated_at?: string;
};

type DemoOrg = {
  id: string;
  name: string;
  tax_id: string;
  created_at: string;
};

type DemoDatabase = {
  org: DemoOrg;
  salons: DemoSalon[];
  services: DemoService[];
  salonServices: DemoSalonService[];
  appointments: DemoAppointment[];
  clients: DemoClient[];
  employees: DemoEmployee[];
};

const now = () => new Date().toISOString();

const seed: DemoDatabase = {
  org: {
    id: DEMO_ORG_ID,
    name: 'Coreboard Demo Org',
    tax_id: 'DEM-00000000',
    created_at: now(),
  },
  salons: [
    {
      id: '11111111-1111-4111-8111-000000000001',
      org_id: DEMO_ORG_ID,
      name: 'Demo Centro',
      address: 'Av. Siempre Viva 742, CABA',
      phone: '+54 11 4000-1000',
      timezone: 'America/Argentina/Buenos_Aires',
      active: true,
      deleted_at: null,
    },
    {
      id: '22222222-2222-4222-8222-000000000002',
      org_id: DEMO_ORG_ID,
      name: 'Demo Norte',
      address: 'Av. del Libertador 1555, Vicente López',
      phone: '+54 11 4100-2000',
      timezone: 'America/Argentina/Buenos_Aires',
      active: true,
      deleted_at: null,
    },
  ],
  services: [
    {
      id: '33333333-3333-4333-8333-000000000003',
      org_id: DEMO_ORG_ID,
      name: 'Corte Clásico',
      base_price: 3500,
      duration_minutes: 30,
      active: true,
      deleted_at: null,
    },
    {
      id: '44444444-4444-4444-8444-000000000004',
      org_id: DEMO_ORG_ID,
      name: 'Coloración Completa',
      base_price: 7800,
      duration_minutes: 90,
      active: true,
      deleted_at: null,
    },
    {
      id: '55555555-5555-4555-8555-000000000005',
      org_id: DEMO_ORG_ID,
      name: 'Tratamiento Nutritivo',
      base_price: 6200,
      duration_minutes: 45,
      active: true,
      deleted_at: null,
    },
  ],
  salonServices: [
    {
      id: '66666666-6666-4666-8666-000000000006',
      salon_id: '11111111-1111-4111-8111-000000000001',
      service_id: '33333333-3333-4333-8333-000000000003',
      price_override: null,
      duration_override: null,
      active: true,
    },
    {
      id: '77777777-7777-4777-8777-000000000007',
      salon_id: '11111111-1111-4111-8111-000000000001',
      service_id: '44444444-4444-4444-8444-000000000004',
      price_override: 8200,
      duration_override: null,
      active: true,
    },
    {
      id: '88888888-8888-4888-8888-000000000008',
      salon_id: '22222222-2222-4222-8222-000000000002',
      service_id: '33333333-3333-4333-8333-000000000003',
      price_override: null,
      duration_override: null,
      active: true,
    },
    {
      id: '99999999-9999-4999-8999-000000000009',
      salon_id: '22222222-2222-4222-8222-000000000002',
      service_id: '55555555-5555-4555-8555-000000000005',
      price_override: null,
      duration_override: null,
      active: true,
    },
  ],
  appointments: [
    {
      id: 'aaaa1111-bbbb-4ccc-8ddd-000000000010',
      org_id: DEMO_ORG_ID,
      salon_id: '11111111-1111-4111-8111-000000000001',
      service_id: '33333333-3333-4333-8333-000000000003',
      stylist_id: 'bbbb1111-cccc-4ddd-8eee-000000000020',
      client_name: 'Juan Pérez',
      client_phone: '+54 11 5000-1000',
      client_email: 'juan.perez@example.com',
      starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: 'confirmed',
      total_amount: 3500,
      notes: 'Cliente recurrente',
      created_by: DEMO_USER_ID,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 'bbbb2222-cccc-4ddd-8eee-000000000011',
      org_id: DEMO_ORG_ID,
      salon_id: '22222222-2222-4222-8222-000000000002',
      service_id: '55555555-5555-4555-8555-000000000005',
      stylist_id: 'cccc2222-dddd-4eee-8fff-000000000021',
      client_name: 'Lucía Rivas',
      client_phone: '+54 11 5000-2000',
      client_email: 'lucia.rivas@example.com',
      starts_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      total_amount: 6200,
      notes: '',
      created_by: DEMO_USER_ID,
      created_at: now(),
      updated_at: now(),
    },
  ],
  clients: [
    {
      id: 'cccc3333-dddd-4eee-8fff-000000000012',
      org_id: DEMO_ORG_ID,
      full_name: 'Juan Pérez',
      phone: '+54 11 5000-1000',
      email: 'juan.perez@example.com',
      marketing_opt_in: true,
      notes: 'Prefiere turnos matutinos',
      created_at: now(),
    },
    {
      id: 'dddd4444-eeee-4fff-8aaa-000000000013',
      org_id: DEMO_ORG_ID,
      full_name: 'Lucía Rivas',
      phone: '+54 11 5000-2000',
      email: 'lucia.rivas@example.com',
      marketing_opt_in: false,
      created_at: now(),
    },
  ],
  employees: [
    {
      id: 'bbbb1111-cccc-4ddd-8eee-000000000020',
      org_id: DEMO_ORG_ID,
      user_id: null,
      full_name: 'Lucía Herrera',
      email: 'lucia.herrera@example.com',
      phone: '+54 11 5400-1000',
      default_commission_pct: 50,
      active: true,
      created_at: now(),
      updated_at: now(),
    },
    {
      id: 'cccc2222-dddd-4eee-8fff-000000000021',
      org_id: DEMO_ORG_ID,
      user_id: null,
      full_name: 'Fernando Ruiz',
      email: 'fernando.ruiz@example.com',
      phone: '+54 11 5400-2000',
      default_commission_pct: 45,
      active: true,
      created_at: now(),
      updated_at: now(),
    },
  ],
};

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

let state: DemoDatabase = deepClone(seed);

const asyncReturn = async <T,>(value: T, delayMs = 0): Promise<T> => {
  return new Promise<T>((resolve) => {
    if (delayMs <= 0) {
      resolve(deepClone(value));
      return;
    }
    setTimeout(() => resolve(deepClone(value)), delayMs);
  });
};

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  const randomHex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${randomHex()}-${randomHex().slice(0, 4)}-${randomHex().slice(0, 4)}-${randomHex().slice(0, 4)}-${randomHex()}${randomHex()}`.slice(0, 36);
};

const ensureOrg = (orgId: string) => {
  if (orgId !== DEMO_ORG_ID) {
    throw new Error('Demo store sólo opera sobre la organización demo');
  }
};

export const demoStore = {
  reset: () => {
    state = deepClone(seed);
  },
  organization: {
    get: () => asyncReturn(state.org),
  },
  salons: {
    list: async (orgId: string) => {
      ensureOrg(orgId);
      return asyncReturn(state.salons.filter(s => s.org_id === orgId && !s.deleted_at));
    },
    create: async (payload: Partial<DemoSalon> & { org_id: string; name: string }) => {
      ensureOrg(payload.org_id);
      const newSalon: DemoSalon = {
        id: generateId(),
        org_id: payload.org_id,
        name: payload.name,
        address: payload.address ?? '',
        phone: payload.phone,
        timezone: payload.timezone ?? 'America/Argentina/Buenos_Aires',
        active: payload.active ?? true,
        deleted_at: null,
      };
      state.salons.push(newSalon);
      return asyncReturn(newSalon);
    },
    update: async (id: string, updates: Partial<DemoSalon>) => {
      const salon = state.salons.find(s => s.id === id);
      if (!salon) throw new Error('Salon not found');
      Object.assign(salon, updates);
      return asyncReturn(salon);
    },
    remove: async (id: string) => {
      const salon = state.salons.find(s => s.id === id);
      if (salon) {
        salon.deleted_at = now();
        salon.active = false;
        state.salonServices.forEach(ss => {
          if (ss.salon_id === id) {
            ss.active = false;
          }
        });
      }
      return asyncReturn(true);
    },
  },
  services: {
    list: async (orgId: string) => {
      ensureOrg(orgId);
      return asyncReturn(state.services.filter(s => s.org_id === orgId && !s.deleted_at && s.active));
    },
    create: async (payload: Partial<DemoService> & { org_id: string; name: string; base_price: number; duration_minutes: number }) => {
      ensureOrg(payload.org_id);
      const newService: DemoService = {
        id: generateId(),
        org_id: payload.org_id,
        name: payload.name,
        base_price: payload.base_price,
        duration_minutes: payload.duration_minutes,
        active: payload.active ?? true,
        deleted_at: null,
      };
      state.services.push(newService);
      return asyncReturn(newService);
    },
    update: async (id: string, updates: Partial<DemoService>) => {
      const service = state.services.find(s => s.id === id);
      if (!service) throw new Error('Service not found');
      Object.assign(service, updates);
      return asyncReturn(service);
    },
    softDelete: async (id: string) => {
      const service = state.services.find(s => s.id === id);
      if (service) {
        service.active = false;
        service.deleted_at = now();
        state.salonServices.forEach(ss => {
          if (ss.service_id === id) {
            ss.active = false;
          }
        });
      }
      return asyncReturn(true);
    },
  },
  salonServices: {
    listBySalon: async (salonId: string) => {
      const assignments = state.salonServices.filter(ss => ss.salon_id === salonId && ss.active);
      const rows = assignments.map(ss => {
        const service = state.services.find(s => s.id === ss.service_id && s.active && !s.deleted_at);
        if (!service) return null;
        return {
          id: ss.id,
          salon_id: ss.salon_id,
          service_id: ss.service_id,
          price_override: ss.price_override ?? undefined,
          duration_override: ss.duration_override ?? undefined,
          active: ss.active,
          service_name: service.name,
          base_price: service.base_price,
          duration_minutes: service.duration_minutes,
        };
      }).filter(Boolean) as Array<{
        id: string;
        salon_id: string;
        service_id: string;
        price_override?: number;
        duration_override?: number;
        active: boolean;
        service_name: string;
        base_price: number;
        duration_minutes: number;
      }>;
      return asyncReturn(rows);
    },
    assign: async (payload: { salon_id: string; service_id: string; price_override?: number; duration_override?: number }) => {
      let assignment = state.salonServices.find(ss => ss.salon_id === payload.salon_id && ss.service_id === payload.service_id);
      if (assignment) {
        assignment.active = true;
        assignment.price_override = payload.price_override ?? assignment.price_override ?? null;
        assignment.duration_override = payload.duration_override ?? assignment.duration_override ?? null;
      } else {
        assignment = {
          id: generateId(),
          salon_id: payload.salon_id,
          service_id: payload.service_id,
          price_override: payload.price_override ?? null,
          duration_override: payload.duration_override ?? null,
          active: true,
        };
        state.salonServices.push(assignment);
      }
      return asyncReturn(assignment);
    },
    update: async (assignmentId: string, updates: { price_override?: number; duration_override?: number }) => {
      const assignment = state.salonServices.find(ss => ss.id === assignmentId);
      if (!assignment) throw new Error('Assignment not found');
      if (typeof updates.price_override !== 'undefined') {
        assignment.price_override = updates.price_override ?? null;
      }
      if (typeof updates.duration_override !== 'undefined') {
        assignment.duration_override = updates.duration_override ?? null;
      }
      return asyncReturn(assignment);
    },
    unassign: async (assignmentId: string) => {
      const assignment = state.salonServices.find(ss => ss.id === assignmentId);
      if (assignment) {
        assignment.active = false;
      }
      return asyncReturn(true);
    },
  },
  appointments: {
    list: async (salonId?: string, orgId?: string) => {
      let results = state.appointments.slice();
      if (orgId) {
        ensureOrg(orgId);
        results = results.filter(a => a.org_id === orgId);
      }
      if (salonId) {
        results = results.filter(a => a.salon_id === salonId);
      }
      results.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
      return asyncReturn(results);
    },
    create: async (payload: Partial<DemoAppointment>) => {
      if (!payload.org_id) throw new Error('org_id requerido');
      ensureOrg(payload.org_id);
      if (!payload.salon_id) throw new Error('salon_id requerido');
      const newAppointment: DemoAppointment = {
        id: generateId(),
        org_id: payload.org_id,
        salon_id: payload.salon_id,
        service_id: payload.service_id ?? '',
        stylist_id: payload.stylist_id ?? null,
        client_name: payload.client_name ?? 'Cliente',
        client_phone: payload.client_phone,
        client_email: payload.client_email,
        starts_at: payload.starts_at ?? now(),
        status: payload.status ?? 'pending',
        total_amount: payload.total_amount ?? 0,
        notes: payload.notes,
        created_by: payload.created_by ?? DEMO_USER_ID,
        created_at: now(),
        updated_at: now(),
      };
      state.appointments.push(newAppointment);
      return asyncReturn(newAppointment);
    },
    update: async (id: string, updates: Partial<DemoAppointment>) => {
      const appointment = state.appointments.find(a => a.id === id);
      if (!appointment) throw new Error('Appointment not found');
      Object.assign(appointment, updates, { updated_at: now() });
      return asyncReturn(appointment);
    },
    remove: async (id: string) => {
      state.appointments = state.appointments.filter(a => a.id !== id);
      return asyncReturn(true);
    },
  },
  clients: {
    list: async (orgId: string) => {
      ensureOrg(orgId);
      return asyncReturn(state.clients.filter(c => c.org_id === orgId));
    },
    create: async (orgId: string, payload: Omit<DemoClient, 'id' | 'org_id' | 'created_at'>) => {
      ensureOrg(orgId);
      const newClient: DemoClient = {
        id: generateId(),
        org_id: orgId,
        full_name: payload.full_name,
        phone: payload.phone,
        email: payload.email,
        notes: payload.notes,
        marketing_opt_in: payload.marketing_opt_in ?? false,
        created_at: now(),
      };
      state.clients.push(newClient);
      return asyncReturn(newClient);
    },
    update: async (id: string, updates: Partial<DemoClient>) => {
      const client = state.clients.find(c => c.id === id);
      if (!client) throw new Error('Client not found');
      Object.assign(client, updates);
      return asyncReturn(client);
    },
    remove: async (id: string) => {
      state.clients = state.clients.filter(c => c.id !== id);
      return asyncReturn(true);
    },
  },
  employees: {
    list: async (orgId: string) => {
      ensureOrg(orgId);
      return asyncReturn(state.employees.filter(e => e.org_id === orgId && e.active));
    },
    create: async (orgId: string, payload: Omit<DemoEmployee, 'id' | 'org_id' | 'created_at'>) => {
      ensureOrg(orgId);
      const newEmployee: DemoEmployee = {
        id: generateId(),
        org_id: orgId,
        user_id: payload.user_id ?? null,
        full_name: payload.full_name,
        email: payload.email,
        phone: payload.phone,
        default_commission_pct: payload.default_commission_pct,
        active: payload.active ?? true,
        created_at: now(),
        updated_at: now(),
      };
      state.employees.push(newEmployee);
      return asyncReturn(newEmployee);
    },
    update: async (id: string, updates: Partial<DemoEmployee>) => {
      const employee = state.employees.find(e => e.id === id);
      if (!employee) throw new Error('Employee not found');
      Object.assign(employee, updates, { updated_at: now() });
      return asyncReturn(employee);
    },
    remove: async (id: string) => {
      const employee = state.employees.find(e => e.id === id);
      if (employee) {
        employee.active = false;
        employee.updated_at = now();
      }
      return asyncReturn(true);
    },
  },
};

export type DemoStore = typeof demoStore;
