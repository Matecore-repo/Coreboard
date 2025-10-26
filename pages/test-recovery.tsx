import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';

export default function TestRecovery() {
  const [step, setStep] = useState<'initial' | 'email' | 'password' | 'complete'>('initial');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(`[TEST] ${message}`);
  };

  const testRecoveryFlow = async () => {
    setLogs([]);
    setLoading(true);
    addLog('🚀 INICIANDO TEST DE RECUPERACIÓN DE CONTRASEÑA');
    addLog('═══════════════════════════════════════════════════');

    try {
      // Paso 1: Verificar si el email existe
      addLog('');
      addLog('PASO 1: Verificando si el email existe en auth.users...');
      
      const { data: { users }, error: getUsersError } = await supabase.auth.admin.listUsers();
      
      if (getUsersError) {
        addLog(`❌ Error al listar usuarios: ${getUsersError.message}`);
        addLog('⚠️  Es normal si no tienes permisos de admin. Continuando...');
      } else {
        const userExists = users.some(u => u.email === email);
        if (userExists) {
          addLog(`✅ Email encontrado: ${email}`);
        } else {
          addLog(`❌ Email NO encontrado: ${email}`);
          addLog('💡 PRIMERO debes crear una cuenta con este email');
          setStep('email');
          setLoading(false);
          return;
        }
      }

      // Paso 2: Solicitar recuperación
      addLog('');
      addLog('PASO 2: Solicitando email de recuperación...');
      addLog(`📧 Enviando a: ${email}`);

      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (recoveryError) {
        addLog(`❌ ERROR en recuperación: ${recoveryError.message}`);
        addLog('🔍 VERIFICA LOS LOGS DE SUPABASE');
        setLoading(false);
        return;
      }

      addLog('✅ Email de recuperación enviado exitosamente');
      addLog('');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      addLog('📋 INSTRUCCIONES MANUALES:');
      addLog('');
      addLog('1️⃣  REVISA TU BANDEJA DE ENTRADA (o spam)');
      addLog(`   Busca email de: noreply@auth.hawpywnmkatwlcbtffrg.supabase.co`);
      addLog('');
      addLog('2️⃣  HAZ CLICK EN EL LINK');
      addLog(`   Será algo como: ...#access_token=...`);
      addLog('');
      addLog('3️⃣  SE ABRIRÁ UNA PÁGINA CON ESTE CARTEL:');
      addLog('   "Escribe tu nueva contraseña"');
      addLog('');
      addLog('4️⃣  VUELVE A ESTA PÁGINA Y PRESIONA');
      addLog('   "Verificar que ya cambié la contraseña"');
      addLog('');
      addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      setStep('password');
      setEmail(email);

    } catch (err: any) {
      addLog(`💥 ERROR GENERAL: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const verifyPasswordChange = async () => {
    setLoading(true);
    addLog('');
    addLog('PASO 3: Verificando cambio de contraseña...');

    try {
      // Intentar login con la nueva contraseña
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: newPassword,
      });

      if (error) {
        addLog(`❌ No se pudo iniciar sesión: ${error.message}`);
        addLog('💡 Posibles causas:');
        addLog('   - La contraseña está mal');
        addLog('   - El email no coincide');
        addLog('   - Aún no completaste el cambio en /auth/reset-password');
        setLoading(false);
        return;
      }

      if (data.session) {
        addLog('✅ ¡ÉXITO! Login exitoso con la nueva contraseña');
        addLog(`📌 Usuario: ${data.user?.email}`);
        addLog(`🔑 Session ID: ${data.session.access_token.substring(0, 20)}...`);
        addLog('');
        addLog('═══════════════════════════════════════════════════');
        addLog('✨ FLUJO DE RECUPERACIÓN COMPLETADO CORRECTAMENTE ✨');
        addLog('═══════════════════════════════════════════════════');

        // Logout
        await supabase.auth.signOut();
        addLog('');
        addLog('🚪 Sesión cerrada automáticamente');

        setStep('complete');
      }

    } catch (err: any) {
      addLog(`💥 ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">
            🔐 Test Recuperación de Contraseña
          </h1>
          <p className="text-gray-600 mb-6">
            Este test guiado ejecuta todo el flujo automáticamente
          </p>

          {/* PASO INICIAL */}
          {step === 'initial' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email para recuperación:
                </label>
                <Input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button
                onClick={testRecoveryFlow}
                disabled={loading || !email}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? '⏳ Enviando...' : '📧 Solicitar Recuperación'}
              </Button>
            </div>
          )}

          {/* PASO 2 - INSTRUCCIONES */}
          {step === 'password' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
                <p className="font-bold text-amber-900 mb-2">⚠️ ACCIÓN REQUERIDA:</p>
                <ol className="text-amber-900 space-y-2 text-sm">
                  <li>1️⃣ Revisa tu email (bandeja de entrada o spam)</li>
                  <li>2️⃣ Busca un email de Supabase</li>
                  <li>3️⃣ Haz click en el link de recuperación</li>
                  <li>4️⃣ En la página que se abre, escribe la NUEVA contraseña</li>
                  <li>5️⃣ Vuelve aquí y presiona el botón de abajo</li>
                </ol>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escribe la nueva contraseña que pusiste:
                </label>
                <Input
                  type="password"
                  placeholder="Nueva contraseña"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirma la contraseña:
                </label>
                <Input
                  type="password"
                  placeholder="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button
                onClick={verifyPasswordChange}
                disabled={loading || !newPassword || newPassword !== confirmPassword}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? '⏳ Verificando...' : '✅ Verificar Cambio de Contraseña'}
              </Button>

              {newPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-600">❌ Las contraseñas no coinciden</p>
              )}
            </div>
          )}

          {/* PASO FINAL */}
          {step === 'complete' && (
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
              <p className="text-4xl mb-4">✨</p>
              <p className="text-2xl font-bold text-green-900 mb-2">¡ÉXITO!</p>
              <p className="text-green-800 mb-4">
                El flujo de recuperación de contraseña funciona correctamente
              </p>
              <Button
                onClick={() => {
                  setStep('initial');
                  setEmail('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                🔄 Hacer otro test
              </Button>
            </div>
          )}

          {/* CONSOLE LOG */}
          <div className="mt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">📊 Logs de Consola:</h2>
            <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">Los logs aparecerán aquí...</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ACCESO RÁPIDO */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              💡 Abre la consola del navegador (F12) para ver más detalles
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
