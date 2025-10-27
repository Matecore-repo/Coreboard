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

-- Signup tokens (para registro cerrado por invitación)
create table if not exists public.signup_tokens (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  description text,
  is_used boolean not null default false,
  used_by uuid references auth.users(id),
  expires_at timestamptz,
  created_at timestamptz default now(),
  used_at timestamptz
);

alter table public.signup_tokens enable row level security;

-- Hook: validar token secreto antes de crear usuario
create or replace function public.hook_require_signup_token(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  provided_token text;
  token_row record;
begin
  provided_token := coalesce(event->'user'->'user_metadata'->>'signup_token', '');

  if provided_token = '' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Token secreto requerido para registrarse',
        'http_code', 400
      )
    );
  end if;

  select * into token_row
  from public.signup_tokens st
  where st.token = provided_token
    and st.is_used = false
    and (st.expires_at is null or st.expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'Token inválido o expirado',
        'http_code', 403
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_require_signup_token(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_require_signup_token(jsonb) from authenticated, anon, public;

-- Hook: marcar token como usado después de crear el usuario
create or replace function public.hook_mark_token_used(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  provided_token text;
  new_user_id uuid;
begin
  provided_token := coalesce(event->'user'->'user_metadata'->>'signup_token', '');
  new_user_id := (event->'user'->>'id')::uuid;

  if provided_token <> '' and new_user_id is not null then
    update public.signup_tokens
    set is_used = true,
        used_by = new_user_id,
        used_at = now()
    where token = provided_token
      and is_used = false;
  end if;

  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_mark_token_used(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_mark_token_used(jsonb) from authenticated, anon, public;

-- Invitations (tokens single-use con rol y organización)
create table if not exists public.invitations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references app.orgs(id) on delete cascade,
  email            citext, -- opcional: fuerza email si se especifica
  role             text not null check (role in ('owner', 'admin', 'employee', 'viewer')),
  token_hash       bytea not null, -- SHA-256 del token (nunca guardamos el token plano)
  expires_at       timestamptz not null default (now() + interval '7 days'),
  used_at          timestamptz,
  used_by          uuid references auth.users(id),
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);

-- Índices críticos
create index if not exists invitations_org_idx on public.invitations(organization_id);
create unique index if not exists invitations_token_unique_open
  on public.invitations(token_hash)
  where used_at is null;
create unique index if not exists invitations_unique_pending_email
  on public.invitations(organization_id, email)
  where used_at is null and email is not null;

alter table public.invitations enable row level security;

-- RLS: Nadie puede leer invitaciones por defecto (evita filtrar hashes)
drop policy if exists "inv_no_select" on public.invitations;
create policy "inv_no_select"
  on public.invitations for select
  using (false);

-- RLS: Admins/Owners del org pueden gestionar invitaciones desde app
drop policy if exists "inv_admin_manage" on public.invitations;
create policy "inv_admin_manage"
  on public.invitations
  using (
    exists (
      select 1 from public.memberships m
      where m.org_id = invitations.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.org_id = invitations.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- RPC: claim_invitation(token_plano) -> crea membership y consume token atómicamente
create or replace function public.claim_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_inv     public.invitations%rowtype;
  v_hash    bytea := digest(p_token, 'sha256');
begin
  if v_user_id is null then
    raise exception 'auth_required' using errcode = 'PT401';
  end if;

  select u.email into v_email from auth.users u where u.id = v_user_id;

  -- Buscamos y bloqueamos la invitación vigente (FOR UPDATE evita carreras)
  select *
    into v_inv
  from public.invitations i
  where i.token_hash = v_hash
    and i.used_at is null
    and now() < i.expires_at
  for update;

  if not found then
    raise exception 'invalid_or_expired_or_used' using errcode = 'PT403';
  end if;

  -- Si la invitación fue nominada, el email debe coincidir
  if v_inv.email is not null and lower(v_inv.email) <> lower(v_email) then
    raise exception 'email_mismatch' using errcode = 'PT403';
  end if;

  -- Idempotente: crea o actualiza membership
  insert into public.memberships(org_id, user_id, role)
  values (v_inv.organization_id, v_user_id, v_inv.role)
  on conflict (org_id, user_id) do update
    set role = excluded.role;

  -- Marca como usada
  update public.invitations
     set used_at = now(),
         used_by = v_user_id
   where id = v_inv.id;

  return jsonb_build_object(
    'organization_id', v_inv.organization_id,
    'role',            v_inv.role
  );
end;
$$;

-- Mantener hooks originales para compatibilidad con signup_tokens existentes
-- Las nuevas invitations se manejan exclusivamente con RPC claim_invitation

