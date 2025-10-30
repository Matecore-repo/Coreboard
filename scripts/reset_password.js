// Script para resetear contraseña usando admin API
const { createClient } = require('@supabase/supabase-js');

// Necesitamos el service key para usar la admin API
const SUPABASE_URL = 'https://hawpywnmkatwlcbtffrg.supabase.co';
// NOTA: Necesitas el SERVICE_KEY para esto, no el anon key
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Necesitas SUPABASE_SERVICE_KEY en las variables de entorno');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function resetPassword() {
  console.log('🔄 Reseteando contraseña para iangel.oned@gmail.com...');

  const { data, error } = await supabase.auth.admin.updateUserById(
    '1651691a-7761-4346-93be-18e8a75395b6', // User ID
    { password: '123456' }
  );

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Contraseña reseteada exitosamente');
    console.log('📧 Email:', data.user.email);
  }
}

resetPassword();
