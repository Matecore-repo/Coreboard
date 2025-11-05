import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { PublicCheckoutView } from '../../src/components/checkout/PublicCheckoutView';
import { Card, CardContent, CardHeader, CardTitle } from '../../src/components/ui/card';

export default function BookPage() {
  const router = useRouter();
  const { token } = router.query;
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

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Validando link de pago...</p>
        </div>
      </div>
    );
  }

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

