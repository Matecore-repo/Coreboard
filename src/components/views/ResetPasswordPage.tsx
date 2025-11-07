import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { toastSuccess, toastError } from '../../lib/toast';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export function ResetPasswordPage() {
  const { updatePassword, loading, session } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Esperar a que la sesión esté disponible
  useEffect(() => {
    // La sesión puede estar null inicialmente, pero si está definida es porque se cargó
    // Damos un tiempo para que Supabase procese el token del link
    const timer = setTimeout(() => {
      setSessionReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      toastError('Sesión no disponible. Recarga la página e intenta de nuevo.');
      return;
    }

    if (!password || !confirmPassword) {
      toastError('Ingresa la contraseña en ambos campos');
      return;
    }

    if (password.length < 6) {
      toastError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toastError('Las contraseñas no coinciden');
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePassword(password);
      toastSuccess('Contraseña actualizada correctamente');
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error: any) {
      const errorMessage = error?.message || 'Error al actualizar la contraseña';
      toastError(errorMessage);
      console.error('Error al actualizar contraseña:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = password && confirmPassword && password === confirmPassword && sessionReady && !!session;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Actualizar contraseña</h1>
            <p className="text-base text-muted-foreground">
              {!sessionReady ? 'Cargando...' : 'Ingresa tu nueva contraseña para continuar'}
            </p>
          </div>

          {!session && sessionReady && (
            <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 text-center">
              <p className="text-sm text-destructive">
                El enlace de recuperación no es válido o ha expirado. Por favor, solicita uno nuevo.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">
                Nueva contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 text-base"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  disabled={!sessionReady || !session}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo 6 caracteres
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-base">
                Confirmar contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12 text-base"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  disabled={!sessionReady || !session}
                />
              </div>
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-destructive">
                Las contraseñas no coinciden
              </p>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base"
              disabled={!isFormValid || isSubmitting || loading}
            >
              {isSubmitting ? 'Actualizando...' : !sessionReady ? 'Cargando...' : 'Actualizar contraseña'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿Recuerdas tu contraseña?{' '}
            <button 
              onClick={() => router.push('/')}
              className="text-foreground hover:underline font-medium"
            >
              Volver al inicio
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
