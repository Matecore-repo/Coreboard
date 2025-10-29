﻿-- Schema DDL for CRM para Turnos (Supabase/Postgres) - Multi-tenant
-- Run this in Supabase SQL editor. Adjust as needed.

-- extensions
create extension if not exists pgcrypto with schema public;

-- Create app schema if it doesn't exist
create schema if not exists app;

-- Organizations (multi-tenant root)
create table if not exists app.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tax_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Compatibilidad: si existe app.orgs pero no app.organizations, usar app.orgs
-- (En caso de migración desde schema anterior)
-- Para sistemas nuevos, app.organizations es la tabla principal

-- Memberships (users to organizations)
create table if not exists app.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'employee', 'viewer')),
  is_primary boolean default false,
  created_at timestamptz default now(),
  unique(org_id, user_id)
);

-- Salons (locations within organizations)
create table if not exists app.salons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  timezone text default 'America/Argentina/Buenos_Aires',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- Employees (organization-wide staff)
create table if not exists app.employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  role text default 'employee' check (role in ('owner', 'admin', 'employee')),
  default_commission_pct numeric default 50.0, -- percentage
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- Salon-Employee assignments (many-to-many)
create table if not exists public.salon_employees (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references app.salons(id) on delete cascade,
  employee_id uuid not null references app.employees(id) on delete cascade,
  active boolean default true,
  assigned_at timestamptz default now(),
  assigned_by uuid references auth.users(id),
  unique(salon_id, employee_id)
);

-- Services (organization-wide catalog)
create table if not exists app.services (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete cascade,
  name text not null,
  base_price numeric not null default 0,
  duration_minutes integer not null default 60,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- Salon-Service relationships (many-to-many with overrides)
create table if not exists app.salon_services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references app.salons(id) on delete cascade,
  service_id uuid not null references app.services(id) on delete cascade,
  price_override numeric, -- NULL = use base_price
  duration_override integer, -- NULL = use duration_minutes
  active boolean default true,
  created_at timestamptz default now(),
  unique(salon_id, service_id)
);

-- Clients (organization-wide)
create table if not exists app.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  notes text,
  marketing_opt_in boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

-- Appointments (bookings)
create table if not exists app.appointments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete cascade,
  salon_id uuid not null references app.salons(id) on delete cascade,
  service_id uuid not null references app.services(id) on delete cascade,
  stylist_id uuid not null references app.employees(id) on delete set null,
  client_name text not null,
  client_phone text,
  client_email text,
  starts_at timestamptz not null, -- combined date + time
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  total_amount numeric not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Constraint: service must be available at this salon
  constraint appointment_service_salon_check
    check (exists (
      select 1 from app.salon_services ss
      where ss.salon_id = appointments.salon_id
      and ss.service_id = appointments.service_id
      and ss.active = true
    )),
  -- Constraint: stylist must be assigned to this salon
  constraint appointment_stylist_salon_check
    check (exists (
      select 1 from public.salon_employees se
      where se.salon_id = appointments.salon_id
      and se.employee_id = appointments.stylist_id
      and se.active = true
    )),
  -- Unique constraint to prevent double bookings
  unique(salon_id, stylist_id, starts_at)
);

-- Appointment items (services within an appointment)
create table if not exists public.appointment_items (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  price numeric not null,
  quantity integer default 1
);

-- Commissions (calculated when appointment is completed)
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  amount numeric not null,
  commission_rate numeric not null,
  date date not null,
  created_at timestamptz default now()
);

-- Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  amount numeric not null,
  payment_method text not null check (payment_method in ('cash', 'card', 'transfer', 'other')),
  date date not null,
  notes text,
  created_at timestamptz default now()
);

-- Expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete cascade,
  salon_id uuid references public.salons(id) on delete set null,
  amount numeric not null,
  description text not null,
  category text,
  date date not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

-- Public views for PostgREST access
create or replace view public.organizations as select * from app.organizations;
create or replace view public.memberships as select * from app.memberships;
create or replace view public.salons as select * from app.salons;
create or replace view public.employees as select * from app.employees;
create or replace view public.services as select * from app.services;
create or replace view public.salon_services as select * from app.salon_services;
create or replace view public.clients as select * from app.clients;
create or replace view public.appointments as select * from app.appointments;

-- Commissions, Payments, Expenses (keeping existing structure)
create table if not exists app.commissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete cascade,
  employee_id uuid not null references app.employees(id) on delete cascade,
  appointment_id uuid references app.appointments(id) on delete set null,
  amount numeric not null,
  commission_pct numeric not null,
  calculated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists app.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete cascade,
  appointment_id uuid references app.appointments(id) on delete set null,
  amount numeric not null,
  payment_method text not null check (payment_method in ('cash', 'card', 'transfer', 'other')),
  processed_at timestamptz default now(),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists app.expenses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references app.organizations(id) on delete cascade,
  salon_id uuid references app.salons(id) on delete set null,
  amount numeric not null,
  description text not null,
  category text,
  incurred_at date not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

-- Invitations table for user invites
create table if not exists app.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references app.organizations(id) on delete cascade,
  email text,
  role text not null check (role in ('owner', 'admin', 'employee', 'viewer')),
  token_hash bytea not null, -- SHA256 hash of the invitation token
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  created_at timestamptz default now(),
  created_by uuid not null references auth.users(id),
  unique(organization_id, token_hash)
);

-- Additional public views
create or replace view public.commissions as select * from app.commissions;
create or replace view public.payments as select * from app.payments;
create or replace view public.expenses as select * from app.expenses;
create or replace view public.invitations as select * from app.invitations;

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
alter table app.organizations enable row level security;
alter table app.memberships enable row level security;
alter table app.salons enable row level security;
alter table app.employees enable row level security;
alter table app.services enable row level security;
alter table app.salon_services enable row level security;
alter table app.clients enable row level security;
alter table app.appointments enable row level security;
alter table app.commissions enable row level security;
alter table app.payments enable row level security;
alter table app.expenses enable row level security;
alter table app.invitations enable row level security;
alter table public.salon_employees enable row level security;

-- Helper function to get current user's org_id
create or replace function auth.org_id()
returns uuid
language sql
security definer
as $$
  select m.org_id
  from app.memberships m
  where m.user_id = auth.uid()
  limit 1;
$$;

-- RLS Policies for Organizations
create policy "organizations_select" on app.organizations
  for select using (
    exists (select 1 from app.memberships m where m.org_id = organizations.id and m.user_id = auth.uid())
  );

create policy "organizations_insert" on app.organizations
  for insert with check (true); -- Allow creation, will be validated in app logic

create policy "organizations_update" on app.organizations
  for update using (
    exists (select 1 from app.memberships m where m.org_id = organizations.id and m.user_id = auth.uid() and m.role in ('owner', 'admin'))
  );

-- RLS Policies for Memberships
create policy "memberships_select" on app.memberships
  for select using (user_id = auth.uid() or org_id = auth.org_id());

create policy "memberships_insert" on app.memberships
  for insert with check (org_id = auth.org_id() and role in ('owner', 'admin', 'employee', 'viewer'));

create policy "memberships_update" on app.memberships
  for update using (org_id = auth.org_id() and role in ('owner', 'admin'));

-- RLS Policies for Salons
create policy "salons_select" on app.salons
  for select using (org_id = auth.org_id() and active = true and deleted_at is null);

create policy "salons_insert" on app.salons
  for insert with check (org_id = auth.org_id());

create policy "salons_update" on app.salons
  for update using (org_id = auth.org_id());

create policy "salons_delete" on app.salons
  for delete using (org_id = auth.org_id());

-- RLS Policies for Employees
create policy "employees_select" on app.employees
  for select using (org_id = auth.org_id() and active = true and deleted_at is null);

create policy "employees_insert" on app.employees
  for insert with check (org_id = auth.org_id());

create policy "employees_update" on app.employees
  for update using (org_id = auth.org_id());

create policy "employees_delete" on app.employees
  for delete using (org_id = auth.org_id());

-- RLS Policies for Salon Employees
create policy "salon_employees_select" on public.salon_employees
  for select using (
    exists (select 1 from app.salons s where s.id = salon_employees.salon_id and s.org_id = auth.org_id())
  );

create policy "salon_employees_insert" on public.salon_employees
  for insert with check (
    exists (select 1 from app.salons s where s.id = salon_employees.salon_id and s.org_id = auth.org_id())
  );

create policy "salon_employees_update" on public.salon_employees
  for update using (
    exists (select 1 from app.salons s where s.id = salon_employees.salon_id and s.org_id = auth.org_id())
  );

-- RLS Policies for Services
create policy "services_select" on app.services
  for select using (org_id = auth.org_id() and active = true and deleted_at is null);

create policy "services_insert" on app.services
  for insert with check (org_id = auth.org_id());

create policy "services_update" on app.services
  for update using (org_id = auth.org_id());

create policy "services_delete" on app.services
  for delete using (org_id = auth.org_id());

-- RLS Policies for Salon Services
create policy "salon_services_select" on app.salon_services
  for select using (
    exists (select 1 from app.salons s where s.id = salon_services.salon_id and s.org_id = auth.org_id()) and active = true
  );

create policy "salon_services_insert" on app.salon_services
  for insert with check (
    exists (select 1 from app.salons s where s.id = salon_services.salon_id and s.org_id = auth.org_id())
  );

create policy "salon_services_update" on app.salon_services
  for update using (
    exists (select 1 from app.salons s where s.id = salon_services.salon_id and s.org_id = auth.org_id())
  );

-- RLS Policies for Clients
create policy "clients_select" on app.clients
  for select using (org_id = auth.org_id() and deleted_at is null);

create policy "clients_insert" on app.clients
  for insert with check (org_id = auth.org_id());

create policy "clients_update" on app.clients
  for update using (org_id = auth.org_id());

create policy "clients_delete" on app.clients
  for delete using (org_id = auth.org_id());

-- RLS Policies for Appointments
create policy "appointments_select" on app.appointments
  for select using (org_id = auth.org_id());

create policy "appointments_insert" on app.appointments
  for insert with check (org_id = auth.org_id());

create policy "appointments_update" on app.appointments
  for update using (org_id = auth.org_id());

create policy "appointments_delete" on app.appointments
  for delete using (org_id = auth.org_id());

-- Indexes for performance (updated for new schema)
create index if not exists idx_memberships_user_id on app.memberships (user_id);
create index if not exists idx_memberships_org_id on app.memberships (org_id);
create index if not exists idx_salons_org_id on app.salons (org_id);
create index if not exists idx_salons_active_deleted on app.salons (org_id, active, deleted_at) where active = true and deleted_at is null;
create index if not exists idx_employees_org_id on app.employees (org_id);
create index if not exists idx_employees_active_deleted on app.employees (org_id, active, deleted_at) where active = true and deleted_at is null;
create index if not exists idx_services_org_id on app.services (org_id);
create index if not exists idx_services_active_deleted on app.services (org_id, active, deleted_at) where active = true and deleted_at is null;
create index if not exists idx_salon_employees_salon on public.salon_employees (salon_id, employee_id, active) where active = true;
create index if not exists idx_salon_services_salon on app.salon_services (salon_id, service_id, active) where active = true;
create index if not exists idx_clients_org_deleted on app.clients (org_id, deleted_at) where deleted_at is null;
create index if not exists idx_appointments_org on app.appointments (org_id);
create index if not exists idx_appointments_salon on app.appointments (salon_id);
create index if not exists idx_appointments_stylist on app.appointments (stylist_id);
create index if not exists idx_appointments_datetime on app.appointments (salon_id, stylist_id, starts_at);
create index if not exists idx_appointments_status on app.appointments (org_id, status, starts_at);
create index if not exists idx_commissions_org on app.commissions (org_id);
create index if not exists idx_payments_org on app.payments (org_id);
create index if not exists idx_expenses_org on app.expenses (org_id);
create index if not exists idx_invitations_org on app.invitations (organization_id, expires_at) where used_at is null;

-- RLS Policies for Invitations
create policy "invitations_select" on app.invitations
  for select using (
    organization_id = auth.org_id()
  );

create policy "invitations_insert" on app.invitations
  for insert with check (
    organization_id = auth.org_id() and created_by = auth.uid()
  );

create policy "invitations_update" on app.invitations
  for update using (
    organization_id = auth.org_id()
  );

create policy "invitations_delete" on app.invitations
  for delete using (
    organization_id = auth.org_id()
  );

-- RPC Function for creating invitations
create or replace function public.create_invitation(
  p_organization_id uuid,
  p_email text default null,
  p_role text default 'employee',
  p_token text default null,
  p_expires_days integer default 7
)
returns json
language plpgsql
security definer
as $$
declare
  v_token_hash bytea;
  v_expires_at timestamptz;
  v_invitation_id uuid;
  v_token text;
begin
  -- Validate role
  if p_role not in ('owner', 'admin', 'employee', 'viewer') then
    raise exception 'Invalid role: %', p_role;
  end if;

  -- Generate token if not provided
  if p_token is null then
    v_token := encode(gen_random_bytes(32), 'base64url');
  else
    v_token := p_token;
  end if;

  -- Create hash of token
  v_token_hash := digest(v_token, 'sha256');

  -- Calculate expiration
  v_expires_at := now() + interval '1 day' * p_expires_days;

  -- Check if user has permission to create invitations for this org
  if not exists (
    select 1 from app.memberships m
    where m.org_id = p_organization_id
    and m.user_id = auth.uid()
    and m.role in ('owner', 'admin')
  ) then
    raise exception 'Access denied: insufficient permissions';
  end if;

  -- Insert invitation
  insert into app.invitations (
    organization_id,
    email,
    role,
    token_hash,
    expires_at,
    created_by
  ) values (
    p_organization_id,
    p_email,
    p_role,
    v_token_hash,
    v_expires_at,
    auth.uid()
  )
  returning id into v_invitation_id;

  -- Return result
  return json_build_object(
    'id', v_invitation_id,
    'organization_id', p_organization_id,
    'email', p_email,
    'role', p_role,
    'expires_at', v_expires_at,
    'token', v_token
  );
end;
$$;
