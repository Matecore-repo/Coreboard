export interface Organization {
  id: string;
  name: string;
  tax_id?: string;
  settings?: any;
  created_at: string;
}

export interface Membership {
  id?: string;
  user_id: string;
  role: 'admin' | 'owner' | 'employee' | 'viewer';
  is_primary: boolean;
  user?: {
    email: string;
    full_name?: string;
  };
  employee?: {
    id: string;
    user_id?: string;
    full_name: string;
    email?: string;
    phone?: string;
    commission_type?: 'percentage' | 'fixed';
    default_commission_pct?: number;
    default_commission_amount?: number;
    active: boolean;
  };
}


