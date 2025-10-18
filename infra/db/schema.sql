-- Schema DDL for CRM para Turnos (Supabase/Postgres) - Multi-tenant
-- Run this in Supabase SQL editor. Adjust as needed.

-- extensions
create extension if not exists pgcrypto with schema public;

-- Organizations (multi-tenant root)
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Memberships (users to organizations)
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'employee', 'viewer')),
  is_primary boolean default false,
  created_at timestamptz default now(),
  unique(org_id, user_id)
);

-- Salons (locations within organizations)
create table if not exists public.salons (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Services (organization-wide)
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  description text,
  base_price numeric not null default 0,
  duration_minutes integer default 60,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Service prices per salon (override base price)
create table if not exists public.salon_service_prices (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  price numeric not null,
  unique(salon_id, service_id)
);

-- Employees (can be linked to auth users)
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text,
  commission_rate numeric default 0.5, -- 50% default
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Clients (organization-wide)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Appointments
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  salon_id uuid not null references public.salons(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null, -- denormalized for performance
  employee_id uuid references public.employees(id) on delete set null,
  date date not null,
  time time not null,
  status text not null check (status in ('pending','confirmed','completed','cancelled')),
  total_amount numeric not null default 0,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
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
  org_id uuid not null references public.orgs(id) on delete cascade,
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
  org_id uuid not null references public.orgs(id) on delete cascade,
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
  org_id uuid not null references public.orgs(id) on delete cascade,
  salon_id uuid references public.salons(id) on delete set null,
  amount numeric not null,
  description text not null,
  category text,
  date date not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_memberships_user_id on public.memberships (user_id);
create index if not exists idx_memberships_org_id on public.memberships (org_id);
create index if not exists idx_salons_org_id on public.salons (org_id);
create index if not exists idx_services_org_id on public.services (org_id);
create index if not exists idx_employees_org_id on public.employees (org_id);
create index if not exists idx_clients_org_id on public.clients (org_id);
create index if not exists idx_appointments_org_id on public.appointments (org_id);
create index if not exists idx_appointments_salon_date on public.appointments (salon_id, date);
create index if not exists idx_commissions_org_id on public.commissions (org_id);
create index if not exists idx_payments_org_id on public.payments (org_id);
create index if not exists idx_expenses_org_id on public.expenses (org_id);

-- Enable RLS
alter table public.orgs enable row level security;
alter table public.memberships enable row level security;
alter table public.salons enable row level security;
alter table public.services enable row level security;
alter table public.salon_service_prices enable row level security;
alter table public.employees enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_items enable row level security;
alter table public.commissions enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

