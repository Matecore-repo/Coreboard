export type Appointment = {
  id: string;
  clientName: string;
  service: string;
  date: string;
  time: string;
  status: string;
  stylist?: string;
  salonId?: string;
};

export type Client = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  salonId?: string;
  notes?: string;
};

export type Commission = {
  id: string;
  stylist: string;
  amount: number;
  date: string;
  salonId?: string;
  sourceAppointmentId?: string;
};

export type UserProfile = {
  id: string;
  email?: string | null;
  role?: 'admin' | 'owner' | 'employee';
  salon_id?: string | null;
};


