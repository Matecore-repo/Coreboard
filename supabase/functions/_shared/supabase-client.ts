/**
 * Helper para crear cliente Supabase con service role
 * Usado en Edge Functions para acceder a la BD sin restricciones RLS
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Crea un cliente Supabase con service role key
 * Este cliente bypassa RLS y puede acceder a todas las tablas
 */
export function createServiceRoleClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

