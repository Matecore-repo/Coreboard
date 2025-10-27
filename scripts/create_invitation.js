#!/usr/bin/env node
// scripts/create_invitation.js
// Uso: node scripts/create_invitation.js <role:owner|admin|employee|viewer> <organization_id> [email] [days_valid=7]
import crypto from 'node:crypto';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const [,, role, organization_id, emailArg, daysArg] = process.argv;

  if (!role || !organization_id) {
    console.error('Uso: node scripts/create_invitation.js <role> <organization_id> [email] [days_valid=7]');
    process.exit(1);
  }
  if (!['owner','admin','employee','viewer'].includes(role)) {
    console.error('Role inválido. Usa: owner | admin | employee | viewer');
    process.exit(1);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en el entorno.');
    process.exit(1);
  }

  // Generar token fuerte (32 bytes) en base64url
  function genToken() {
    return crypto.randomBytes(32).toString('base64url');
  }
  function sha256Bytes(s) {
    return crypto.createHash('sha256').update(s).digest(); // Buffer
  }

  const token = genToken();
  const token_hash = sha256Bytes(token);
  const days = Number.isFinite(Number(daysArg)) ? Number(daysArg) : 7;
  const expires_at = new Date(Date.now() + days*24*60*60*1000).toISOString();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const payload = {
    organization_id,
    role,
    token_hash,                // Buffer -> supabase-js lo manda como base64; PostgREST lo acepta para bytea
    expires_at,
    ...(emailArg ? { email: emailArg } : {})
  };

  const { data, error } = await supabase
    .from('invitations')
    .insert(payload)
    .select('id, organization_id, email, role, expires_at')
    .single();

  if (error) {
    console.error('Error creando invitación:', error);
    process.exit(1);
  }

  console.log('✅ Invitación creada');
  console.log('ID:', data.id);
  console.log('Org:', data.organization_id);
  if (data.email) console.log('Email:', data.email);
  console.log('Role:', data.role);
  console.log('Expira:', data.expires_at);
  console.log('---');
  console.log('🔑 TOKEN (compartilo con la persona invitada):');
  console.log(token);
  console.log('---');
  console.log('⚠️ Guardá este token. No se puede recuperar desde la base porque guardamos solo el hash.');
}

main().catch((err) => { console.error(err); process.exit(1); });


