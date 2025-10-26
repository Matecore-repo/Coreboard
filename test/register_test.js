// Test de registro con token secreto
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserRegistration() {
  console.log('🧪 Iniciando test de registro con token...');
  
  // Datos de prueba
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testToken = 'core-58a6c1f42df4ce9d0dd81ff5a6ec01c9b0e788130e846c48';
  
  console.log(`📧 Email: ${testEmail}`);
  console.log(`🔑 Token: ${testToken}`);
  
  try {
    // Intentar registro con token
    console.log('🚀 Intentando registro...');
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          signup_token: testToken
        }
      }
    });
    
    if (error) {
      console.error('❌ Error en registro:', error.message);
      console.error('📋 Detalles del error:', error);
      return;
    }
    
    if (data.user) {
      console.log('✅ Usuario creado exitosamente!');
      console.log('👤 ID del usuario:', data.user.id);
      console.log('📧 Email:', data.user.email);
      console.log('🔍 Metadata:', data.user.user_metadata);
      
      if (data.session) {
        console.log('🔐 Sesión activa:', !!data.session);
      } else {
        console.log('📬 Confirmación por email requerida');
      }
    } else {
      console.log('⚠️ No se creó usuario (posible confirmación por email)');
    }
    
  } catch (err) {
    console.error('💥 Error inesperado:', err);
  }
}

async function testInvalidToken() {
  console.log('\n🧪 Probando con token inválido...');
  
  const testEmail = `invalid-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const invalidToken = 'token-invalido';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          signup_token: invalidToken
        }
      }
    });
    
    if (error) {
      console.log('✅ Token inválido rechazado correctamente:', error.message);
    } else {
      console.log('❌ ERROR: Token inválido fue aceptado!');
    }
    
  } catch (err) {
    console.error('💥 Error inesperado:', err);
  }
}

async function testNoToken() {
  console.log('\n🧪 Probando sin token...');
  
  const testEmail = `notoken-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.log('✅ Registro sin token rechazado:', error.message);
    } else {
      console.log('❌ ERROR: Registro sin token fue aceptado!');
    }
    
  } catch (err) {
    console.error('💥 Error inesperado:', err);
  }
}

// Ejecutar tests
async function runTests() {
  console.log('🚀 Iniciando tests de registro con token secreto\n');
  
  await testUserRegistration();
  await testInvalidToken();
  await testNoToken();
  
  console.log('\n✅ Tests completados');
}

runTests().catch(console.error);

