// Script para crear usuario de prueba usando la API de Supabase
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hawpywnmkatwlcbtffrg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhhd3B5d25ta2F0d2xjYnRmZnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDU1MDYsImV4cCI6MjA3NDgyMTUwNn0.Rp8cwqKsq6dxP6Yb8H5movLCgDWK-Cd6dJ2rF6kFnLs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createTestUser() {
  console.log('🧪 Creando usuario de prueba...');

  const { data, error } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: '123456',
    options: {
      emailRedirectTo: 'http://localhost:3001/auth/callback'
    }
  });

  if (error) {
    console.error('❌ Error creando usuario:', error);
    return;
  }

  if (data.user) {
    console.log('✅ Usuario creado:', data.user.email);
    console.log('🔄 Esperando confirmación de email...');

    // Intentar confirmar el email automáticamente (esto podría no funcionar)
    try {
      const { error: confirmError } = await supabase.auth.updateUser({
        email_confirm: true
      });
      if (confirmError) {
        console.log('⚠️ No se pudo confirmar automáticamente, puede requerir verificación manual');
      } else {
        console.log('✅ Email confirmado automáticamente');
      }
    } catch (e) {
      console.log('⚠️ Confirmación automática falló, puede requerir verificación manual');
    }
  }
}

createTestUser();
