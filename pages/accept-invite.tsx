import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/contexts/AuthContext';
import { validateInvitation, getInvitationErrorMessage } from '../src/lib/invitationValidator';
import { toast } from 'sonner';
import { PageContainer } from '../src/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function AcceptInvitePage() {
  const router = useRouter();
  const { token } = router.query;
  const { user, session, claimInvitation, loading: authLoading } = useAuth();
  const [validating, setValidating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationValid, setInvitationValid] = useState(false);

  // Validar invitación al cargar
  useEffect(() => {
    if (!token || typeof token !== 'string') {
      setError('Token de invitación no válido');
      return;
    }

    const validate = async () => {
      setValidating(true);
      try {
        // Si el usuario está logueado, validar con su email
        if (user && session) {
          const validation = await validateInvitation(token, user.email || '');
          if (!validation.valid) {
            setError(getInvitationErrorMessage(validation.error));
            setInvitationValid(false);
          } else {
            setInvitationValid(true);
          }
        } else {
          // Usuario no logueado, solo validar que el token existe
          // La validación completa se hará después del login
          setInvitationValid(true);
        }
      } catch (err: any) {
        setError(err.message || 'Error al validar invitación');
        setInvitationValid(false);
      } finally {
        setValidating(false);
      }
    };

    validate();
  }, [token, user, session]);

  // Si no está logueado, mostrar login
  if (!user || !session) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Aceptar Invitación</CardTitle>
              <CardDescription>
                Debes iniciar sesión para aceptar esta invitación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                El link de invitación se procesará automáticamente después de iniciar sesión.
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  // Guardar el token en sessionStorage para recuperarlo después del login
                  if (token && typeof token === 'string') {
                    sessionStorage.setItem('pending_invitation_token', token);
                  }
                  router.push('/login');
                }}
              >
                Ir al Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // Si está logueado pero validando
  if (validating) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Validando invitación...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // Si hay error
  if (error) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error en la Invitación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/dashboard')}
              >
                Volver al Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // Si la invitación es válida, mostrar botón para aceptar
  if (invitationValid && token && typeof token === 'string') {
    const handleAccept = async () => {
      if (!token || typeof token !== 'string') return;

      setAccepting(true);
      try {
        await claimInvitation(token);
        toast.success('¡Invitación aceptada! Ya formas parte de la organización.');
        
        // Esperar un momento para que se actualice el estado
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Redirigir al dashboard
        router.push('/dashboard');
      } catch (err: any) {
        setError(err.message || 'Error al aceptar invitación');
        setAccepting(false);
      }
    };

    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invitación Válida</CardTitle>
              <CardDescription>
                Has sido invitado a unirte a una organización
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Invitación válida
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Puedes aceptar esta invitación para unirte a la organización
                  </p>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aceptando...
                  </>
                ) : (
                  'Aceptar Invitación'
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/dashboard')}
                disabled={accepting}
              >
                Cancelar
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return null;
}

