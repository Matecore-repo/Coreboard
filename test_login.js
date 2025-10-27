// Script para probar login directamente
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hawpywnmkatwlcbtffrg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhhd3B5d25ta2F0d2xjYnRmZnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNDU1MDYsImV4cCI6MjA3NDgyMTUwNn0.Rp8cwqKsq6dxP6Yb8H5movLCgDWK-Cd6dJ2rF6kFnLs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin() {
  console.log('🔐 Probando login...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'iangel.oned@gmail.com',
    password: '123456'
  });

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Login exitoso:', data.user?.email);
  }
}

testLogin();
