-- Migración: Fix CRUD Finanzas y soporte comisiones fijas/porcentaje
-- Agrega columnas faltantes y soporte para comisiones fijas además de porcentajes

-- ============================================================================
-- 1. AMPLIAR TABLA expenses
-- ============================================================================
ALTER TABLE app.expenses
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('fixed', 'variable', 'supply_purchase')),
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES app.suppliers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invoice_number text,
ADD COLUMN IF NOT EXISTS invoice_date date,
ADD COLUMN IF NOT EXISTS payment_status text CHECK (payment_status IN ('pending', 'paid', 'partial')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS due_date date,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Índices para expenses
CREATE INDEX IF NOT EXISTS idx_expenses_type ON app.expenses(type);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier_id ON app.expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_status ON app.expenses(payment_status);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON app.expenses(created_by);

-- ============================================================================
-- 2. AMPLIAR TABLA payments (mapear method a payment_method para compatibilidad)
-- ============================================================================
-- Agregar columnas adicionales que faltan
ALTER TABLE app.payments
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tip_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS gateway_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_method_detail text,
ADD COLUMN IF NOT EXISTS gateway_transaction_id text,
ADD COLUMN IF NOT EXISTS gateway_settlement_date date,
ADD COLUMN IF NOT EXISTS gateway_settlement_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Crear vista/compatibilidad para payment_method (usando method existente)
-- Nota: El código debe usar 'method' pero podemos agregar una columna calculada o vista

-- Índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_gateway_settlement_date ON app.payments(gateway_settlement_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON app.payments(created_by);

-- ============================================================================
-- 3. AMPLIAR TABLA commissions (agregar campos faltantes)
-- ============================================================================
ALTER TABLE app.commissions
ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES app.appointments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS date date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Índice para commissions
CREATE INDEX IF NOT EXISTS idx_commissions_appointment_id ON app.commissions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_commissions_date ON app.commissions(date);

-- ============================================================================
-- 4. AMPLIAR TABLA employees (soporte comisiones fijas y porcentajes)
-- ============================================================================
-- Agregar campos para comisiones fijas
ALTER TABLE app.employees
ADD COLUMN IF NOT EXISTS commission_type text CHECK (commission_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS default_commission_amount numeric DEFAULT 0 CHECK (default_commission_amount >= 0);

-- Comentario: Si commission_type = 'percentage', usar default_commission_pct
-- Si commission_type = 'fixed', usar default_commission_amount

-- ============================================================================
-- 5. CREAR TABLA invoices (si no existe)
-- ============================================================================
CREATE TABLE IF NOT EXISTS app.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.orgs(id) ON DELETE CASCADE,
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

-- Índices para invoices
CREATE INDEX IF NOT EXISTS idx_invoices_org_date ON app.invoices(org_id, date);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON app.invoices(client_id);

-- ============================================================================
-- 6. CREAR VISTA PÚBLICA PARA invoices
-- ============================================================================
CREATE OR REPLACE VIEW public.invoices AS SELECT * FROM app.invoices;

-- ============================================================================
-- 7. HABILITAR RLS EN invoices
-- ============================================================================
ALTER TABLE app.invoices ENABLE ROW LEVEL SECURITY;

