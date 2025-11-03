-- Migración: Ampliar esquema de finanzas
-- Agregar campos a tablas existentes y crear nuevas tablas para el módulo de finanzas completo

-- ============================================================================
-- 1. AMPLIAR TABLA appointments
-- ============================================================================
ALTER TABLE app.appointments
ADD COLUMN IF NOT EXISTS duration_minutes integer,
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tip_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS list_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_collected numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS gateway_commission numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS direct_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS booking_source text,
ADD COLUMN IF NOT EXISTS campaign_code text,
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES app.clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_new_client boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_visit_date date;

-- ============================================================================
-- 2. AMPLIAR TABLA payments
-- ============================================================================
ALTER TABLE app.payments
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tip_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS gateway_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method_detail text,
ADD COLUMN IF NOT EXISTS gateway_transaction_id text,
ADD COLUMN IF NOT EXISTS gateway_settlement_date date,
ADD COLUMN IF NOT EXISTS gateway_settlement_amount numeric DEFAULT 0;

-- ============================================================================
-- 3. AMPLIAR TABLA expenses
-- ============================================================================
ALTER TABLE app.expenses
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('fixed', 'variable', 'supply_purchase')),
ADD COLUMN IF NOT EXISTS supplier_id uuid,
ADD COLUMN IF NOT EXISTS invoice_number text,
ADD COLUMN IF NOT EXISTS invoice_date date,
ADD COLUMN IF NOT EXISTS payment_status text CHECK (payment_status IN ('pending', 'paid', 'partial')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS due_date date;

-- ============================================================================
-- 4. CREAR TABLA suppliers
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  tax_id text,
  contact_info jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agregar foreign key en expenses.supplier_id
ALTER TABLE app.expenses
ADD CONSTRAINT expenses_supplier_fk 
FOREIGN KEY (supplier_id) REFERENCES app.suppliers(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. CREAR TABLA daily_cash_registers
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.daily_cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  salon_id uuid REFERENCES app.salons(id) ON DELETE SET NULL,
  date date NOT NULL,
  opening_amount numeric DEFAULT 0,
  closing_amount numeric DEFAULT 0,
  actual_amount numeric DEFAULT 0,
  difference numeric DEFAULT 0,
  opened_by uuid REFERENCES auth.users(id),
  closed_by uuid REFERENCES auth.users(id),
  opened_at timestamptz,
  closed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, salon_id, date)
);

-- ============================================================================
-- 6. CREAR TABLA cash_movements
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id uuid NOT NULL REFERENCES app.daily_cash_registers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount numeric NOT NULL,
  description text,
  payment_id uuid REFERENCES app.payments(id) ON DELETE SET NULL,
  expense_id uuid REFERENCES app.expenses(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 7. CREAR TABLA invoices
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('invoice', 'credit_note', 'debit_note')),
  number text NOT NULL,
  date date NOT NULL,
  client_id uuid REFERENCES app.clients(id) ON DELETE SET NULL,
  net_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_status text,
  payment_method text,
  tax_aliquots jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, type, number)
);

-- ============================================================================
-- 8. CREAR TABLA supply_purchases
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.supply_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES app.suppliers(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  purchase_date date NOT NULL,
  invoice_id uuid REFERENCES app.invoices(id) ON DELETE SET NULL,
  stock_remaining numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 9. CREAR TABLA gateway_reconciliations
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.gateway_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  gateway_name text NOT NULL,
  transaction_date date NOT NULL,
  sold_amount numeric NOT NULL DEFAULT 0,
  settled_amount numeric NOT NULL DEFAULT 0,
  credited_amount numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  difference numeric DEFAULT 0,
  settlement_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 10. CREAR VISTAS PÚBLICAS
-- ============================================================================
CREATE OR REPLACE VIEW public.suppliers AS SELECT * FROM app.suppliers;
CREATE OR REPLACE VIEW public.daily_cash_registers AS SELECT * FROM app.daily_cash_registers;
CREATE OR REPLACE VIEW public.cash_movements AS SELECT * FROM app.cash_movements;
CREATE OR REPLACE VIEW public.invoices AS SELECT * FROM app.invoices;
CREATE OR REPLACE VIEW public.supply_purchases AS SELECT * FROM app.supply_purchases;
CREATE OR REPLACE VIEW public.gateway_reconciliations AS SELECT * FROM app.gateway_reconciliations;

-- ============================================================================
-- 11. HABILITAR RLS EN NUEVAS TABLAS
-- ============================================================================
ALTER TABLE app.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.daily_cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.supply_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.gateway_reconciliations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 12. ÍNDICES PARA PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON app.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_source ON app.appointments(booking_source);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_method ON app.appointments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_settlement_date ON app.payments(gateway_settlement_date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON app.expenses(type);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_id ON app.expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_status ON app.expenses(payment_status);
CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON app.suppliers(org_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_org_salon_date ON app.daily_cash_registers(org_id, salon_id, date);
CREATE INDEX IF NOT EXISTS idx_cash_movements_register_id ON app.cash_movements(register_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_date ON app.invoices(org_id, date);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON app.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_supply_purchases_org_date ON app.supply_purchases(org_id, purchase_date);
CREATE INDEX IF NOT EXISTS idx_gateway_reconciliations_org_date ON app.gateway_reconciliations(org_id, transaction_date);

