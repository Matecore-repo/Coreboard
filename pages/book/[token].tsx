import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { PublicCheckoutView } from '../../src/components/checkout/PublicCheckoutView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { useAuth } from '../../src/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function BookPage() {
  const router = useRouter();
  const { token } = router.query;
  const { session, loading: authLoading, signInWithGoogle } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (!token || typeof token !== 'string') {
      setIsValidating(false);
      setIsValid(false);
      return;
    }

    const validateToken = async () => {
      try {
        const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;
        
        const response = await fetch(
          `${functionsUrl}/get-payment-link-config?token=${encodeURIComponent(token)}`
        );

        if (response.ok) {
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      } catch (error) {
        console.error('Error validando token:', error);
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  // Mostrar loading mientras se valida autenticación y token
  if (authLoading || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">
            {authLoading ? 'Verificando autenticación...' : 'Validando link de pago...'}
          </p>
        </div>
      </div>
    );
  }

  // Si no hay sesión, requerir autenticación con Google
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl mb-2">Inicia sesión para continuar</CardTitle>
            <CardDescription>
              Necesitas iniciar sesión con Google para reservar tu turno
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={async () => {
                try {
                  // Guardar el token del payment link en sessionStorage para después de la autenticación
                  if (token && typeof token === 'string') {
                    sessionStorage.setItem('pending_payment_token', token);
                  }
                  await signInWithGoogle();
                } catch (error: any) {
                  console.error('Error iniciando sesión con Google:', error);
                }
              }}
              className="w-full"
              size="lg"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar con Google
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Al continuar, aceptas nuestros términos y condiciones de uso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si el token no es válido, mostrar error
  if (!isValid || !token || typeof token !== 'string') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-destructive">
              Link de pago inválido o expirado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              El link de pago no es válido o ha expirado. Por favor, contacta con el establecimiento
              para obtener un nuevo link de pago.
            </p>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Si crees que esto es un error, verifica que el link esté completo y no haya sido modificado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PublicCheckoutView token={token} />;
}

