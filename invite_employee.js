/**
 * Script para invitar a un empleado
 * Ejecutar con: node invite_employee.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer .env.local
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  } catch (e) {
    console.log('⚠️ No se pudo leer .env.local, usando variables de entorno del sistema');
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL no está configurado');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurado');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inviteEmployee() {
  const email = 'nachoangelone@gmail.com';
  
  try {
    console.log(`\n📧 Invitando a ${email} como empleado...`);
    
    // Primero, obtener la primera organización disponible
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(1)
      .single();
    
    if (orgError || !orgs) {
      console.error('❌ No se encontró ninguna organización. Crea una primero.');
      return;
    }
    
    console.log(`✓ Organización encontrada: ${orgs.name} (${orgs.id})`);
    
    // Obtener el primer salón de esa organización
    const { data: salons, error: salonError } = await supabase
      .from('salons')
      .select('id, name')
      .eq('org_id', orgs.id)
      .limit(1)
      .single();
    
    if (salonError || !salons) {
      console.error('❌ No se encontró ningún salón. Crea uno primero.');
      return;
    }
    
    console.log(`✓ Salón encontrado: ${salons.name} (${salons.id})`);
    
    // Crear la invitación
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        org_id: orgs.id,
        salon_id: salons.id,
        email: email,
        role: 'employee',
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
      })
      .select()
      .single();
    
    if (inviteError) {
      console.error('❌ Error al crear la invitación:', inviteError.message);
      return;
    }
    
    console.log('\n✅ Invitación creada exitosamente!');
    console.log(`   Email: ${email}`);
    console.log(`   Rol: employee`);
    console.log(`   Organización: ${orgs.name}`);
    console.log(`   Salón: ${salons.name}`);
    console.log(`   Token: ${invitation.token || 'N/A'}`);
    console.log('\n📨 El empleado puede aceptar la invitación desde la app.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

inviteEmployee();

