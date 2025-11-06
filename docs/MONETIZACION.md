# Estrategias de Monetización para Coreboard

## Situación Actual

Coreboard actualmente es **gratuito** para las organizaciones. No existe:
- Sistema de suscripciones/planes
- Comisiones que Coreboard cobre a los usuarios
- Modelo de facturación

## Estrategias Propuestas

### 1. Modelo de Suscripción por Niveles (SaaS Tradicional)

**Ventajas:**
- Ingresos recurrentes predecibles
- Fácil de implementar y gestionar
- Escalable según el tamaño del negocio

**Planes Sugeridos:**

#### Plan Básico - $29/mes
- 1 salón
- Hasta 5 empleados
- Hasta 500 turnos/mes
- Checkout público básico
- Reportes básicos
- Soporte por email

#### Plan Pro - $79/mes
- Hasta 3 salones
- Empleados ilimitados
- Turnos ilimitados
- Checkout público avanzado
- Analytics y reportes avanzados
- Payment links personalizados
- Integración con Mercado Pago
- Soporte prioritario

#### Plan Enterprise - $199/mes
- Salones ilimitados
- Todo del Plan Pro
- API personalizada
- White-label (quitar marca Coreboard)
- Integraciones personalizadas
- Soporte dedicado
- SLA garantizado

**Implementación:**
- Nueva tabla `app.subscriptions` con campos: `plan_type`, `status`, `billing_cycle`, `current_period_start`, `current_period_end`
- Middleware para verificar límites por plan
- UI para gestión de suscripción en Settings

---

### 2. Comisión por Transacción (Transaction-Based)

**Ventajas:**
- Los usuarios solo pagan cuando ganan
- Atractivo para negocios pequeños
- Escala automáticamente con el éxito del cliente

**Modelo:**
- **2-3%** sobre cada pago procesado a través de Coreboard
- Solo aplica a pagos con Mercado Pago (no efectivo)
- Cobro automático al momento del pago
- Sin comisión por pagos en efectivo

**Implementación:**
- Nueva tabla `app.platform_commissions` para trackear comisiones de Coreboard
- Trigger en `app.payments` que calcula comisión cuando `payment_method = 'mercadopago'`
- Dashboard de comisiones acumuladas
- Integración con sistema de facturación automática

**Ejemplo:**
```
Turno: $3,500 (Mercado Pago)
Comisión Coreboard (2%): $70
Neto al salón: $3,430
```

---

### 3. Modelo Híbrido (Suscripción + Transaccional)

**Ventajas:**
- Combina ingresos recurrentes con escalabilidad
- Flexibilidad para diferentes tipos de negocios

**Modelo:**
- **Plan Starter**: $19/mes + 1.5% por transacción
- **Plan Growth**: $49/mes + 0.5% por transacción
- **Plan Enterprise**: $149/mes + 0% por transacción

**Casos de uso:**
- Starter: Salones pequeños con pocos turnos
- Growth: Salones medianos con volumen moderado
- Enterprise: Cadenas grandes con alto volumen

---

### 4. Features Premium (Freemium)

**Ventajas:**
- Atrae usuarios con versión gratuita
- Monetiza solo features avanzadas

**Modelo Gratis:**
- 1 salón
- Hasta 3 empleados
- Hasta 100 turnos/mes
- Checkout básico
- Reportes básicos

**Modelo Premium:**
- Todo del gratis +
- Salones ilimitados
- Empleados ilimitados
- Turnos ilimitados
- Analytics avanzados
- Payment links personalizados
- Integración Mercado Pago
- Exportación de datos
- Soporte prioritario

**Precio:** $49/mes o $490/año (2 meses gratis)

---

## Recomendación: Modelo Híbrido (Opción 3)

### Justificación

1. **Flexibilidad**: Permite que diferentes tipos de negocios elijan según su modelo
2. **Escalabilidad**: Los ingresos crecen con el éxito de los clientes
3. **Competitividad**: Precios accesibles para empezar, pero escalables
4. **Predictibilidad**: Ingresos base mensuales garantizados

### Implementación Técnica

#### 1. Esquema de Base de Datos

```sql
-- Tabla de suscripciones
CREATE TABLE app.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('starter', 'growth', 'enterprise')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id)
);

-- Tabla de comisiones de plataforma
CREATE TABLE app.platform_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES app.payments(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  commission_rate numeric NOT NULL, -- % cobrado
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'refunded')),
  collected_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Tabla de límites por plan
CREATE TABLE app.plan_limits (
  plan_type text PRIMARY KEY,
  max_salons integer,
  max_employees integer,
  max_appointments_per_month integer,
  transaction_fee_rate numeric, -- % de comisión por transacción
  monthly_price numeric NOT NULL,
  yearly_price numeric, -- NULL si no disponible
  features jsonb DEFAULT '{}'::jsonb
);

-- Datos iniciales de planes
INSERT INTO app.plan_limits (plan_type, max_salons, max_employees, max_appointments_per_month, transaction_fee_rate, monthly_price, yearly_price, features) VALUES
  ('starter', 1, 10, 500, 0.015, 19.00, 190.00, '{"checkout_public": true, "mercado_pago": true, "basic_reports": true}'),
  ('growth', 5, 50, 2000, 0.005, 49.00, 490.00, '{"checkout_public": true, "mercado_pago": true, "advanced_reports": true, "custom_payment_links": true, "analytics": true}'),
  ('enterprise', NULL, NULL, NULL, 0.000, 149.00, 1490.00, '{"checkout_public": true, "mercado_pago": true, "advanced_reports": true, "custom_payment_links": true, "analytics": true, "api_access": true, "white_label": true, "dedicated_support": true}');
```

#### 2. Triggers para Comisiones de Plataforma

```sql
-- Función para calcular comisión de Coreboard
CREATE OR REPLACE FUNCTION app.calculate_platform_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription app.subscriptions;
  v_plan_limit app.plan_limits;
  v_commission_amount numeric;
BEGIN
  -- Solo aplicar a pagos de Mercado Pago
  IF NEW.payment_method != 'mercadopago' THEN
    RETURN NEW;
  END IF;

  -- Obtener suscripción activa
  SELECT * INTO v_subscription
  FROM app.subscriptions
  WHERE org_id = NEW.org_id
    AND status = 'active'
    AND current_period_end > now();

  -- Si no hay suscripción activa, usar plan por defecto (starter)
  IF v_subscription IS NULL THEN
    v_subscription.plan_type := 'starter';
  END IF;

  -- Obtener límites del plan
  SELECT * INTO v_plan_limit
  FROM app.plan_limits
  WHERE plan_type = v_subscription.plan_type;

  -- Calcular comisión
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular comisión automáticamente
CREATE TRIGGER calculate_platform_commission_trigger
  AFTER INSERT ON app.payments
  FOR EACH ROW
  EXECUTE FUNCTION app.calculate_platform_commission();
```

#### 3. Validación de Límites por Plan

```sql
-- Función para verificar límites
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
    AND current_period_end > now();

  -- Si no hay suscripción, usar plan starter
  IF v_subscription IS NULL THEN
    v_subscription.plan_type := 'starter';
  END IF;

  -- Obtener límites
  SELECT * INTO v_plan_limit
  FROM app.plan_limits
  WHERE plan_type = v_subscription.plan_type;

  -- Verificar según tipo
  CASE p_check_type
    WHEN 'salon' THEN
      IF v_plan_limit.max_salons IS NOT NULL THEN
        SELECT COUNT(*) INTO v_current_count
        FROM app.salons
        WHERE org_id = p_org_id AND deleted_at IS NULL;
        
        RETURN (v_current_count + p_count) <= v_plan_limit.max_salons;
      END IF;
      RETURN true; -- Enterprise: sin límite

    WHEN 'employee' THEN
      IF v_plan_limit.max_employees IS NOT NULL THEN
        SELECT COUNT(*) INTO v_current_count
        FROM app.employees
        WHERE org_id = p_org_id AND deleted_at IS NULL;
        
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
```

#### 4. Componentes Frontend Necesarios

**Nuevos componentes:**
- `SubscriptionBilling.tsx` - Gestión de suscripción
- `PlanSelector.tsx` - Selector de planes
- `UsageLimits.tsx` - Mostrar uso actual vs límites
- `PlatformCommissions.tsx` - Dashboard de comisiones acumuladas
- `UpgradePrompt.tsx` - Prompts cuando se alcanzan límites

**Hooks:**
- `useSubscription.ts` - Gestión de suscripción
- `usePlanLimits.ts` - Verificación de límites
- `usePlatformCommissions.ts` - Comisiones de plataforma

#### 5. Integración con Pasarela de Pago

**Opciones:**
1. **Mercado Pago** (ya integrado) - Para suscripciones recurrentes
2. **Stripe** - Alternativa internacional
3. **Facturación manual** - Para clientes Enterprise

**Flujo de suscripción:**
1. Usuario elige plan en Settings
2. Se genera preferencia de pago en Mercado Pago
3. Usuario completa pago
4. Webhook actualiza estado de suscripción
5. Usuario accede a features según plan

---

## Métricas de Éxito

### KPIs a Monitorear

1. **MRR (Monthly Recurring Revenue)**
   - Suma de todas las suscripciones mensuales activas

2. **ARR (Annual Recurring Revenue)**
   - MRR × 12 + suscripciones anuales

3. **Churn Rate**
   - % de clientes que cancelan por mes

4. **LTV (Lifetime Value)**
   - Ingresos totales esperados de un cliente

5. **CAC (Customer Acquisition Cost)**
   - Costo de adquirir un nuevo cliente

6. **Transaction Volume**
   - Volumen total procesado (para calcular comisiones)

7. **Average Revenue Per User (ARPU)**
   - Ingresos totales / número de clientes activos

---

## Plan de Implementación

### Fase 1: MVP de Monetización (2-3 semanas)
- [ ] Crear tablas de suscripciones y comisiones
- [ ] Implementar triggers de comisiones
- [ ] Crear UI básica de selección de planes
- [ ] Integrar con Mercado Pago para suscripciones
- [ ] Implementar validación de límites básicos

### Fase 2: Features Completas (3-4 semanas)
- [ ] Dashboard de comisiones
- [ ] Gestión completa de suscripción (cambiar plan, cancelar)
- [ ] Notificaciones de límites
- [ ] Reportes de ingresos
- [ ] Testing completo

### Fase 3: Optimización (2 semanas)
- [ ] A/B testing de precios
- [ ] Optimización de conversión
- [ ] Mejoras de UX
- [ ] Documentación

---

## Consideraciones Adicionales

### Período de Prueba
- Ofrecer 14 días gratis en todos los planes
- Sin requerir tarjeta de crédito
- Cancelación automática si no se actualiza

### Migración de Usuarios Existentes
- Ofrecer 3 meses gratis a usuarios actuales
- Gran plan (Growth) para usuarios existentes
- Comunicación clara de cambios

### Soporte y Onboarding
- Guías de migración
- Soporte dedicado durante transición
- Tutoriales de uso de features premium

---

## Conclusión

El **modelo híbrido** ofrece el mejor equilibrio entre:
- Ingresos predecibles (suscripciones)
- Escalabilidad (comisiones por transacción)
- Flexibilidad (múltiples planes)
- Competitividad (precios accesibles)

**ROI Estimado:**
- Si 100 clientes eligen Plan Starter: $1,900/mes base + comisiones
- Si 50 clientes eligen Plan Growth: $2,450/mes base + comisiones
- Si 10 clientes eligen Plan Enterprise: $1,490/mes base

**Total estimado inicial:** ~$5,840/mes base + comisiones por transacciones

