-- Schema DDL for CRM para Turnos (Supabase/Postgres)
-- Run this in Supabase SQL editor. Adjust as needed.

-- extensions
create extension if not exists pgcrypto with schema public;

-- profiles (role context for RLS)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('admin','owner','employee','demo')),
  salon_id text
);

-- appointments
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  service text,
  date date not null,
  time time not null,
  status text not null check (status in ('pending','confirmed','completed','cancelled')),
  stylist text,
  stylist_id uuid,
  salon_id text not null,
  created_by uuid
);
create index if not exists idx_appointments_salon_date on public.appointments (salon_id, date);

-- clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  salon_id text not null,
  notes text
);
create index if not exists idx_clients_salon on public.clients (salon_id);

-- commissions
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  stylist_id uuid,
  salon_id text not null,
  amount numeric not null,
  date date not null,
  source_appointment_id uuid references public.appointments(id) on delete set null
);
create index if not exists idx_commissions_salon_date on public.commissions (salon_id, date);

-- enable RLS and policies can be applied from infra/db/supabase_rls.sql

