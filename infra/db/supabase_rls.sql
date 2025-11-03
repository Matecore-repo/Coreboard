-- RLS Policies for Multi-tenant Coreboard
-- Run this after creating the schema

-- Organizations: Users can only see orgs they belong to
CREATE POLICY "Users can view their organizations" ON public.orgs
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert organizations" ON public.orgs
  FOR INSERT WITH CHECK (true); -- Will be validated in application logic

CREATE POLICY "Owners can update their organizations" ON public.orgs
  FOR UPDATE USING (
    id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Memberships: Users can only see their own memberships
CREATE POLICY "Users can view their memberships" ON public.memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert memberships" ON public.memberships
  FOR INSERT WITH CHECK (true); -- Will be validated in application logic

CREATE POLICY "Owners can update memberships" ON public.memberships
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Salons: Users can only see salons from their organizations
CREATE POLICY "Users can view their organization salons" ON public.salons
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert salons" ON public.salons
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization salons" ON public.salons
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization salons" ON public.salons
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Services: Organization-wide access
CREATE POLICY "Users can view their organization services" ON public.services
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert services" ON public.services
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization services" ON public.services
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization services" ON public.services
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Salon Service Prices: Based on salon access
CREATE POLICY "Users can view salon service prices" ON public.salon_service_prices
  FOR SELECT USING (
    salon_id IN (
      SELECT s.id FROM public.salons s
      JOIN public.memberships m ON s.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage salon service prices" ON public.salon_service_prices
  FOR ALL USING (
    salon_id IN (
      SELECT s.id FROM public.salons s
      JOIN public.memberships m ON s.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );

-- Employees: Organization-wide access
CREATE POLICY "Users can view their organization employees" ON public.employees
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert employees" ON public.employees
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization employees" ON public.employees
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization employees" ON public.employees
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Clients: Organization-wide access
CREATE POLICY "Users can view their organization clients" ON public.clients
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clients" ON public.clients
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization clients" ON public.clients
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization clients" ON public.clients
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Appointments: Based on salon access
CREATE POLICY "Users can view their organization appointments" ON public.appointments
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert appointments" ON public.appointments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

-- Permitir crear turnos desde la pasarela pública (sin auth) si hay un payment_link activo
-- NOTA: Esta política es básica. En producción, se recomienda usar una función RPC que valide el token
CREATE POLICY "Public can insert appointments via payment link" ON public.appointments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.payment_links 
      WHERE active = true AND expires_at > now()
    )
  );

CREATE POLICY "Users can update their organization appointments" ON public.appointments
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization appointments" ON public.appointments
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Appointment Items: Based on appointment access
CREATE POLICY "Users can view appointment items" ON public.appointment_items
  FOR SELECT USING (
    appointment_id IN (
      SELECT a.id FROM public.appointments a
      JOIN public.memberships m ON a.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage appointment items" ON public.appointment_items
  FOR ALL USING (
    appointment_id IN (
      SELECT a.id FROM public.appointments a
      JOIN public.memberships m ON a.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );

-- Commissions: Based on employee access
CREATE POLICY "Users can view their organization commissions" ON public.commissions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert commissions" ON public.commissions
  FOR INSERT WITH CHECK (true); -- Will be managed by triggers

CREATE POLICY "Users can update their organization commissions" ON public.commissions
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

-- Payments: Based on organization access
CREATE POLICY "Users can view their organization payments" ON public.payments
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payments" ON public.payments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization payments" ON public.payments
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization payments" ON public.payments
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Expenses: Based on organization access
CREATE POLICY "Users can view their organization expenses" ON public.expenses
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert expenses" ON public.expenses
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their organization expenses" ON public.expenses
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization expenses" ON public.expenses
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- FINANZAS: Solo owners pueden acceder
-- ============================================================================

-- Suppliers: Solo owners
CREATE POLICY "Owners can view their organization suppliers" ON public.suppliers
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can insert suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can update their organization suppliers" ON public.suppliers
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their organization suppliers" ON public.suppliers
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Daily Cash Registers: Solo owners
CREATE POLICY "Owners can view their organization cash registers" ON public.daily_cash_registers
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can insert cash registers" ON public.daily_cash_registers
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can update their organization cash registers" ON public.daily_cash_registers
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their organization cash registers" ON public.daily_cash_registers
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Cash Movements: Solo owners
CREATE POLICY "Owners can view cash movements" ON public.cash_movements
  FOR SELECT USING (
    register_id IN (
      SELECT dcr.id FROM public.daily_cash_registers dcr
      JOIN public.memberships m ON dcr.org_id = m.org_id
      WHERE m.user_id = auth.uid() AND m.role = 'owner'
    )
  );

CREATE POLICY "Owners can insert cash movements" ON public.cash_movements
  FOR INSERT WITH CHECK (
    register_id IN (
      SELECT dcr.id FROM public.daily_cash_registers dcr
      JOIN public.memberships m ON dcr.org_id = m.org_id
      WHERE m.user_id = auth.uid() AND m.role = 'owner'
    )
  );

CREATE POLICY "Owners can update cash movements" ON public.cash_movements
  FOR UPDATE USING (
    register_id IN (
      SELECT dcr.id FROM public.daily_cash_registers dcr
      JOIN public.memberships m ON dcr.org_id = m.org_id
      WHERE m.user_id = auth.uid() AND m.role = 'owner'
    )
  );

CREATE POLICY "Owners can delete cash movements" ON public.cash_movements
  FOR DELETE USING (
    register_id IN (
      SELECT dcr.id FROM public.daily_cash_registers dcr
      JOIN public.memberships m ON dcr.org_id = m.org_id
      WHERE m.user_id = auth.uid() AND m.role = 'owner'
    )
  );

-- Invoices: Solo owners
CREATE POLICY "Owners can view their organization invoices" ON public.invoices
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can update their organization invoices" ON public.invoices
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their organization invoices" ON public.invoices
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Supply Purchases: Solo owners
CREATE POLICY "Owners can view their organization supply purchases" ON public.supply_purchases
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can insert supply purchases" ON public.supply_purchases
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can update their organization supply purchases" ON public.supply_purchases
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their organization supply purchases" ON public.supply_purchases
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Gateway Reconciliations: Solo owners
CREATE POLICY "Owners can view their organization gateway reconciliations" ON public.gateway_reconciliations
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can insert gateway reconciliations" ON public.gateway_reconciliations
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can update their organization gateway reconciliations" ON public.gateway_reconciliations
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their organization gateway reconciliations" ON public.gateway_reconciliations
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Payments: Actualizar para restringir acceso a owners
DROP POLICY IF EXISTS "Users can view their organization payments" ON public.payments;
CREATE POLICY "Owners can view their organization payments" ON public.payments
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Users can insert payments" ON public.payments;
CREATE POLICY "Owners can insert payments" ON public.payments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Permitir crear pagos desde la pasarela pública (sin auth) si hay un payment_link activo
CREATE POLICY "Public can insert payments via payment link" ON public.payments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.payment_links 
      WHERE active = true AND expires_at > now()
    )
  );

DROP POLICY IF EXISTS "Users can update their organization payments" ON public.payments;
CREATE POLICY "Owners can update their organization payments" ON public.payments
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Expenses: Actualizar para restringir acceso a owners
DROP POLICY IF EXISTS "Users can view their organization expenses" ON public.expenses;
CREATE POLICY "Owners can view their organization expenses" ON public.expenses
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Users can insert expenses" ON public.expenses;
CREATE POLICY "Owners can insert expenses" ON public.expenses
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    ) AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their organization expenses" ON public.expenses;
CREATE POLICY "Owners can update their organization expenses" ON public.expenses
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Commissions: Actualizar para restringir acceso a owners
DROP POLICY IF EXISTS "Users can view their organization commissions" ON public.commissions;
CREATE POLICY "Owners can view their organization commissions" ON public.commissions
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Users can update their organization commissions" ON public.commissions;
CREATE POLICY "Owners can update their organization commissions" ON public.commissions
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Payment Links: Solo owners pueden crear y ver links de pago de su organización
-- Los links de pago deben ser accesibles públicamente (sin autenticación) para la pasarela
DROP POLICY IF EXISTS "Owners can view their organization payment links" ON public.payment_links;
CREATE POLICY "Owners can view their organization payment links" ON public.payment_links
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

DROP POLICY IF EXISTS "Owners can insert payment links" ON public.payment_links;
CREATE POLICY "Owners can insert payment links" ON public.payment_links
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Permitir acceso público (sin auth) para validar el token en la pasarela
-- Esto permite que cualquiera pueda ver payment_links activos y no expirados
DROP POLICY IF EXISTS "Public can view active payment links" ON public.payment_links;
CREATE POLICY "Public can view active payment links" ON public.payment_links
  FOR SELECT USING (active = true AND expires_at > now());