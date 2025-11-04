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

-- ============================================================================
-- 8. FUNCIÓN PARA GENERAR COMISIÓN AUTOMÁTICAMENTE AL COMPLETAR TURNO
-- ============================================================================
CREATE OR REPLACE FUNCTION app.generate_commission_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_employee_id uuid;
  v_employee_record app.employees%ROWTYPE;
  v_commission_amount numeric;
  v_commission_pct numeric;
  v_appointment_total numeric;
  v_commission_exists boolean;
BEGIN
  -- Solo generar comisión cuando turno se completa y no había estado completado antes
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Verificar si ya existe una comisión para este appointment
    SELECT EXISTS(
      SELECT 1 FROM app.commissions
      WHERE appointment_id = NEW.id
    ) INTO v_commission_exists;
    
    -- Si no existe comisión, crear una automáticamente
    IF NOT v_commission_exists THEN
      -- Obtener el employee_id del appointment (stylist_id)
      -- La tabla appointments tiene stylist_id que referencia a app.employees
      v_employee_id := NEW.stylist_id;
      
      -- Si no hay stylist_id, intentar buscar por user_id del creador del appointment
      IF v_employee_id IS NULL THEN
        SELECT id INTO v_employee_id
        FROM app.employees
        WHERE user_id = NEW.created_by
          AND org_id = NEW.org_id
          AND active = true
        LIMIT 1;
      END IF;
      
      -- Si encontramos un empleado, generar la comisión
      IF v_employee_id IS NOT NULL THEN
        -- Obtener datos del empleado
        SELECT * INTO v_employee_record
        FROM app.employees
        WHERE id = v_employee_id;
        
        -- Obtener total del appointment
        v_appointment_total := COALESCE(NEW.total_amount, 0);
        
        -- Calcular comisión según tipo (percentage o fixed)
        IF v_employee_record.commission_type = 'fixed' THEN
          -- Comisión fija
          v_commission_amount := COALESCE(v_employee_record.default_commission_amount, 0);
          v_commission_pct := 0;
        ELSE
          -- Comisión por porcentaje
          v_commission_pct := COALESCE(v_employee_record.default_commission_pct, 0);
          v_commission_amount := (v_appointment_total * v_commission_pct / 100);
        END IF;
        
               -- Solo crear comisión si hay un monto mayor a cero
               IF v_commission_amount > 0 THEN
                 INSERT INTO app.commissions (
                   org_id,
                   appointment_item_id,
                   employee_id,
                   appointment_id,
                   amount,
                   pct,
                   date,
                   created_at
                 ) VALUES (
                   NEW.org_id,
                   NEW.id, -- Use appointment_id as appointment_item_id if no separate items
                   v_employee_id,
                   NEW.id,
                   v_commission_amount,
                   v_commission_pct,
                   CURRENT_DATE,
                   NOW()
                 );
               END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para generar comisiones automáticamente
DROP TRIGGER IF EXISTS generate_commission_on_complete_trigger ON app.appointments;
CREATE TRIGGER generate_commission_on_complete_trigger
  AFTER UPDATE ON app.appointments
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed'))
  EXECUTE FUNCTION app.generate_commission_on_complete();

