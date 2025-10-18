-- ======================================
-- Seed Data para Coreboard
-- ======================================
-- Este script crea datos de prueba para validar la aplicación
-- Ejecutar desde Supabase SQL Editor o con: psql -U postgres -d postgres -f seed.sql

-- 1. Crear organización de prueba
INSERT INTO app.orgs (name, tax_id, settings)
VALUES (
  'Salón de Pruebas',
  '20-12345678-9',
  '{"currency": "ARS", "timezone": "America/Argentina/Buenos_Aires"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Obtener el ID de la org (asumimos que es la primera)
-- En producción, esto debería ser dinámico
INSERT INTO app.salons (org_id, name, address, phone, timezone, active)
SELECT 
  id,
  'Centro',
  'Avenida Corrientes 123',
  '+54 11 1234-5678',
  'America/Argentina/Buenos_Aires',
  true
FROM app.orgs
WHERE name = 'Salón de Pruebas'
ON CONFLICT DO NOTHING;

INSERT INTO app.salons (org_id, name, address, phone, timezone, active)
SELECT 
  id,
  'Sucursal Norte',
  'Avenida Santa Fe 456',
  '+54 11 9876-5432',
  'America/Argentina/Buenos_Aires',
  true
FROM app.orgs
WHERE name = 'Salón de Pruebas'
ON CONFLICT DO NOTHING;

-- 2. Crear servicios
INSERT INTO app.services (org_id, name, duration_minutes, base_price, active)
SELECT 
  id,
  'Corte Clásico',
  30,
  500.00,
  true
FROM app.orgs WHERE name = 'Salón de Pruebas'
UNION ALL
SELECT 
  id,
  'Corte + Barba',
  45,
  800.00,
  true
FROM app.orgs WHERE name = 'Salón de Pruebas'
UNION ALL
SELECT 
  id,
  'Tratamiento Capilar',
  60,
  1200.00,
  true
FROM app.orgs WHERE name = 'Salón de Pruebas'
UNION ALL
SELECT 
  id,
  'Tinte y Corte',
  90,
  1800.00,
  true
FROM app.orgs WHERE name = 'Salón de Pruebas'
ON CONFLICT DO NOTHING;

-- 3. Crear empleados
INSERT INTO app.employees (org_id, full_name, email, phone, default_commission_pct, active)
SELECT 
  id,
  'Juan Pérez - Barbero',
  'juan@coreboard.local',
  '+54 11 1111-1111',
  15.00,
  true
FROM app.orgs WHERE name = 'Salón de Pruebas'
UNION ALL
SELECT 
  id,
  'María García - Estilista',
  'maria@coreboard.local',
  '+54 11 2222-2222',
  18.00,
  true
FROM app.orgs WHERE name = 'Salón de Pruebas'
UNION ALL
SELECT 
  id,
  'Carlos López - Colorista',
  'carlos@coreboard.local',
  '+54 11 3333-3333',
  20.00,
  true
FROM app.orgs WHERE name = 'Salón de Pruebas'
ON CONFLICT DO NOTHING;

-- 4. Crear clientes
INSERT INTO app.clients (org_id, full_name, phone, email, notes, marketing_opt_in)
SELECT 
  id,
  'Diego Rodríguez',
  '+54 11 9111-1111',
  'diego@example.com',
  'Cliente VIP - Corte cada 2 semanas',
  true
FROM app.orgs WHERE name = 'Salón de Pruebas'
UNION ALL
SELECT 
  id,
  'Ana Martínez',
  '+54 11 9222-2222',
  'ana@example.com',
  'Prefiere estilista María',
  true
FROM app.orgs WHERE name = 'Salón de Pruebas'
UNION ALL
SELECT 
  id,
  'Roberto Torres',
  '+54 11 9333-3333',
  'roberto@example.com',
  null,
  false
FROM app.orgs WHERE name = 'Salón de Pruebas'
UNION ALL
SELECT 
  id,
  'Paula Fernández',
  '+54 11 9444-4444',
  'paula@example.com',
  'Colorista - Cita mensual',
  true
FROM app.orgs WHERE name = 'Salón de Pruebas'
UNION ALL
SELECT 
  id,
  'Lucas Gómez',
  '+54 11 9555-5555',
  'lucas@example.com',
  null,
  false
FROM app.orgs WHERE name = 'Salón de Pruebas'
ON CONFLICT DO NOTHING;

-- 5. Crear reglas de comisión
INSERT INTO app.commission_rules (org_id, scope, pct, start_date, active)
SELECT 
  id,
  'global',
  12.00,
  CURRENT_DATE,
  true
FROM app.orgs WHERE name = 'Salón de Pruebas'
ON CONFLICT DO NOTHING;


