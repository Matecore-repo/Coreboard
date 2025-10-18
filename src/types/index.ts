export type Appointment = {
  id: string;
  org_id: string;
  salon_id: string;
  client_id?: string;
  client_name: string;
  employee_id?: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  total_amount: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  org_id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type Commission = {
  id: string;
  org_id: string;
  employee_id: string;
  appointment_id?: string;
  amount: number;
  commission_rate: number;
  date: string;
  created_at: string;
};

export type Organization = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Salon = {
  id: string;
  org_id: string;
  name: string;
  address?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
};

export type Service = {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  base_price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Employee = {
  id: string;
  org_id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Membership = {
  id: string;
  org_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'employee' | 'viewer';
  is_primary: boolean;
  created_at: string;
};

export type UserProfile = {
  id: string;
  email?: string | null;
  memberships: Membership[];
  current_org_id?: string;
  isNewUser?: boolean;
};


