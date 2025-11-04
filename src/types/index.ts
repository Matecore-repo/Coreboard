export type Appointment = {
  id: string;
  org_id: string;
  salon_id: string;
  service_id: string;
  stylist_id?: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  starts_at: string;
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
  full_name: string;
  phone?: string;
  email?: string;
  notes?: string;
  marketing_opt_in?: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
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
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Employee = {
  id: string;
  org_id: string;
  user_id?: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: 'owner' | 'admin' | 'employee';
  default_commission_pct: number;
  commission_type?: 'percentage' | 'fixed';
  default_commission_amount?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
};

export type SalonService = {
  id: string;
  salon_id: string;
  service_id: string;
  price_override?: number;
  duration_override?: number;
  active: boolean;
  created_at: string;
};

export type SalonEmployee = {
  id: string;
  salon_id: string;
  employee_id: string;
  active: boolean;
  assigned_at: string;
  assigned_by: string;
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

export type Expense = {
  id: string;
  org_id: string;
  salon_id?: string;
  amount: number;
  description: string;
  category?: string;
  type?: 'fixed' | 'variable' | 'supply_purchase';
  supplier_id?: string;
  invoice_number?: string;
  invoice_date?: string;
  payment_status?: 'pending' | 'paid' | 'partial';
  due_date?: string;
  incurred_at: string;
  created_by: string;
  created_at: string;
};

export type DailyCashRegister = {
  id: string;
  org_id: string;
  salon_id?: string;
  date: string;
  opening_amount: number;
  closing_amount: number;
  actual_amount: number;
  difference: number;
  opened_by?: string;
  closed_by?: string;
  opened_at?: string;
  closed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type CashMovement = {
  id: string;
  register_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description?: string;
  payment_id?: string;
  expense_id?: string;
  created_at: string;
};

export type Supplier = {
  id: string;
  org_id: string;
  name: string;
  tax_id?: string;
  contact_info?: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  org_id: string;
  type: 'invoice' | 'credit_note' | 'debit_note';
  number: string;
  date: string;
  client_id?: string;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status?: string;
  payment_method?: string;
  tax_aliquots?: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type SupplyPurchase = {
  id: string;
  org_id: string;
  supplier_id?: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  purchase_date: string;
  invoice_id?: string;
  stock_remaining: number;
  created_at: string;
  updated_at: string;
};

export type GatewayReconciliation = {
  id: string;
  org_id: string;
  gateway_name: string;
  transaction_date: string;
  sold_amount: number;
  settled_amount: number;
  credited_amount: number;
  commission_amount: number;
  difference: number;
  settlement_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

// Mercado Pago Types
export type MercadoPagoCredentials = {
  org_id: string;
  collector_id: number;
  scope?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
};

export type MPPayment = {
  id: string;
  org_id: string;
  appointment_id?: string;
  mp_payment_id: number;
  mp_preference_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'refunded' | 'chargeback' | 'cancelled';
  amount: number;
  currency: string;
  raw?: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type MPPreferenceResponse = {
  url: string;
  preference_id: string;
  sandbox_init_point?: string;
};

export type MPPreferenceRequest = {
  org_id: string;
  appointment_id: string;
  title: string;
  amount: number;
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
};


