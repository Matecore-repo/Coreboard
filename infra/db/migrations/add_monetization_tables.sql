-- Migración: Sistema de Monetización para Coreboard
-- Crea tablas y funciones necesarias para suscripciones y comisiones de plataforma

-- Tabla de suscripciones
CREATE TABLE IF NOT EXISTS app.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('starter', 'growth', 'enterprise')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id)
);

-- Tabla de comisiones de plataforma (Coreboard cobra a los usuarios)
CREATE TABLE IF NOT EXISTS app.platform_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES app.payments(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  commission_rate numeric NOT NULL, -- % cobrado (ej: 0.015 = 1.5%)
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'refunded')),
  collected_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tabla de límites y configuración por plan
CREATE TABLE IF NOT EXISTS app.plan_limits (
  plan_type text PRIMARY KEY,
  max_salons integer, -- NULL = ilimitado
  max_employees integer, -- NULL = ilimitado
  max_appointments_per_month integer, -- NULL = ilimitado
  transaction_fee_rate numeric NOT NULL, -- % de comisión por transacción (ej: 0.015 = 1.5%)
  monthly_price numeric NOT NULL,
  yearly_price numeric, -- NULL si no disponible
  features jsonb DEFAULT '{}'::jsonb
);

-- Insertar planes predefinidos
INSERT INTO app.plan_limits (plan_type, max_salons, max_employees, max_appointments_per_month, transaction_fee_rate, monthly_price, yearly_price, features) VALUES
  ('starter', 1, 10, 500, 0.015, 19.00, 190.00, '{"checkout_public": true, "mercado_pago": true, "basic_reports": true, "payment_links": false}'::jsonb),
  ('growth', 5, 50, 2000, 0.005, 49.00, 490.00, '{"checkout_public": true, "mercado_pago": true, "advanced_reports": true, "custom_payment_links": true, "analytics": true, "export_data": true}'::jsonb),
  ('enterprise', NULL, NULL, NULL, 0.000, 149.00, 1490.00, '{"checkout_public": true, "mercado_pago": true, "advanced_reports": true, "custom_payment_links": true, "analytics": true, "export_data": true, "api_access": true, "white_label": true, "dedicated_support": true}'::jsonb)
ON CONFLICT (plan_type) DO NOTHING;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON app.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON app.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_org_id ON app.platform_commissions(org_id);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_payment_id ON app.platform_commissions(payment_id);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_status ON app.platform_commissions(status);

-- Función para calcular comisión de plataforma automáticamente
CREATE OR REPLACE FUNCTION app.calculate_platform_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription app.subscriptions;
  v_plan_limit app.plan_limits;
  v_commission_amount numeric;
BEGIN
  -- Solo aplicar a pagos de Mercado Pago
  IF NEW.payment_method != 'mercadopago' AND NEW.payment_method != 'mp' THEN
    RETURN NEW;
  END IF;

  -- Obtener suscripción activa
  SELECT * INTO v_subscription
  FROM app.subscriptions
  WHERE org_id = NEW.org_id
    AND status = 'active'
    AND current_period_end > now()
  LIMIT 1;

  -- Si no hay suscripción activa, usar plan por defecto (starter)
  IF v_subscription IS NULL THEN
    v_subscription.plan_type := 'starter';
  END IF;

  -- Obtener límites del plan
  SELECT * INTO v_plan_limit
  FROM app.plan_limits
  WHERE plan_type = v_subscription.plan_type;

  -- Si no hay plan definido, usar starter por defecto
  IF v_plan_limit IS NULL THEN
    SELECT * INTO v_plan_limit
    FROM app.plan_limits
    WHERE plan_type = 'starter';
  END IF;

  -- Calcular comisión (solo si el rate > 0)
  IF v_plan_limit.transaction_fee_rate > 0 THEN
    v_commission_amount := NEW.amount * v_plan_limit.transaction_fee_rate;

    -- Insertar comisión de plataforma
    INSERT INTO app.platform_commissions (
      org_id,
      payment_id,
      amount,
      commission_rate,
      status
    ) VALUES (
      NEW.org_id,
      NEW.id,
      v_commission_amount,
      v_plan_limit.transaction_fee_rate,
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular comisión automáticamente al crear un pago
DROP TRIGGER IF EXISTS calculate_platform_commission_trigger ON app.payments;
CREATE TRIGGER calculate_platform_commission_trigger
  AFTER INSERT ON app.payments
  FOR EACH ROW
  EXECUTE FUNCTION app.calculate_platform_commission();

-- Función para verificar límites del plan
CREATE OR REPLACE FUNCTION app.check_plan_limits(
  p_org_id uuid,
  p_check_type text, -- 'salon', 'employee', 'appointment'
  p_count integer DEFAULT 1
)
RETURNS boolean AS $$
DECLARE
  v_subscription app.subscriptions;
  v_plan_limit app.plan_limits;
  v_current_count integer;
BEGIN
  -- Obtener suscripción activa
  SELECT * INTO v_subscription
  FROM app.subscriptions
  WHERE org_id = p_org_id
    AND status = 'active'
    AND current_period_end > now()
  LIMIT 1;

  -- Si no hay suscripción, usar plan starter por defecto
  IF v_subscription IS NULL THEN
    v_subscription.plan_type := 'starter';
  END IF;

  -- Obtener límites
  SELECT * INTO v_plan_limit
  FROM app.plan_limits
  WHERE plan_type = v_subscription.plan_type;

  -- Si no hay plan, permitir (modo gratuito)
  IF v_plan_limit IS NULL THEN
    RETURN true;
  END IF;

  -- Verificar según tipo
  CASE p_check_type
    WHEN 'salon' THEN
      IF v_plan_limit.max_salons IS NOT NULL THEN
        SELECT COUNT(*) INTO v_current_count
        FROM app.salons
        WHERE org_id = p_org_id AND (deleted_at IS NULL OR deleted_at > now());
        
        RETURN (v_current_count + p_count) <= v_plan_limit.max_salons;
      END IF;
      RETURN true; -- Enterprise: sin límite

    WHEN 'employee' THEN
      IF v_plan_limit.max_employees IS NOT NULL THEN
        SELECT COUNT(*) INTO v_current_count
        FROM app.employees
        WHERE org_id = p_org_id AND (deleted_at IS NULL OR deleted_at > now());
        
        RETURN (v_current_count + p_count) <= v_plan_limit.max_employees;
      END IF;
      RETURN true;

    WHEN 'appointment' THEN
      IF v_plan_limit.max_appointments_per_month IS NOT NULL THEN
        SELECT COUNT(*) INTO v_current_count
        FROM app.appointments
        WHERE org_id = p_org_id
          AND created_at >= date_trunc('month', now())
          AND created_at < date_trunc('month', now()) + interval '1 month';
        
        RETURN (v_current_count + p_count) <= v_plan_limit.max_appointments_per_month;
      END IF;
      RETURN true;

    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener información del plan actual
CREATE OR REPLACE FUNCTION app.get_current_plan(p_org_id uuid)
RETURNS json AS $$
DECLARE
  v_subscription app.subscriptions;
  v_plan_limit app.plan_limits;
  v_result json;
BEGIN
  -- Obtener suscripción activa
  SELECT * INTO v_subscription
  FROM app.subscriptions
  WHERE org_id = p_org_id
    AND status = 'active'
    AND current_period_end > now()
  LIMIT 1;

  -- Si no hay suscripción, retornar plan starter por defecto
  IF v_subscription IS NULL THEN
    SELECT * INTO v_plan_limit
    FROM app.plan_limits
    WHERE plan_type = 'starter';
    
    v_result := json_build_object(
      'plan_type', 'starter',
      'status', 'trial',
      'max_salons', v_plan_limit.max_salons,
      'max_employees', v_plan_limit.max_employees,
      'max_appointments_per_month', v_plan_limit.max_appointments_per_month,
      'transaction_fee_rate', v_plan_limit.transaction_fee_rate,
      'features', v_plan_limit.features
    );
  ELSE
    -- Obtener límites del plan
    SELECT * INTO v_plan_limit
    FROM app.plan_limits
    WHERE plan_type = v_subscription.plan_type;
    
    v_result := json_build_object(
      'plan_type', v_subscription.plan_type,
      'status', v_subscription.status,
      'billing_cycle', v_subscription.billing_cycle,
      'current_period_end', v_subscription.current_period_end,
      'max_salons', v_plan_limit.max_salons,
      'max_employees', v_plan_limit.max_employees,
      'max_appointments_per_month', v_plan_limit.max_appointments_per_month,
      'transaction_fee_rate', v_plan_limit.transaction_fee_rate,
      'features', v_plan_limit.features
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies para las nuevas tablas
ALTER TABLE app.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.platform_commissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para subscriptions (solo miembros de la org pueden ver su suscripción)
CREATE POLICY "Users can view their organization's subscription"
  ON app.subscriptions FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM app.memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Only owners can manage subscriptions"
  ON app.subscriptions FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM app.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Políticas RLS para platform_commissions (solo miembros pueden ver)
CREATE POLICY "Users can view their organization's platform commissions"
  ON app.platform_commissions FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM app.memberships WHERE user_id = auth.uid()
    )
  );

-- Vista pública para plan_limits (todos pueden ver los planes disponibles)
CREATE OR REPLACE VIEW public.plan_limits AS SELECT * FROM app.plan_limits;
GRANT SELECT ON public.plan_limits TO anon, authenticated;

-- Comentarios en las tablas
COMMENT ON TABLE app.subscriptions IS 'Suscripciones de las organizaciones a Coreboard';
COMMENT ON TABLE app.platform_commissions IS 'Comisiones que Coreboard cobra sobre transacciones procesadas';
COMMENT ON TABLE app.plan_limits IS 'Configuración de límites y precios por plan';

COMMENT ON FUNCTION app.calculate_platform_commission() IS 'Calcula y registra comisión de plataforma al crear un pago';
COMMENT ON FUNCTION app.check_plan_limits(uuid, text, integer) IS 'Verifica si una operación excede los límites del plan';
COMMENT ON FUNCTION app.get_current_plan(uuid) IS 'Retorna información del plan actual de una organización';

