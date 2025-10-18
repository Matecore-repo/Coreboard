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