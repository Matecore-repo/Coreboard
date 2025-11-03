import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { appointment_id } = router.query;

  useEffect(() => {
    // Redirigir al dashboard después de 5 segundos
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">¡Pago exitoso!</CardTitle>
          <CardDescription>
            Tu pago ha sido procesado correctamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Tu turno ha sido confirmado y el pago fue aprobado.
            {appointment_id && (
              <span className="block mt-2 text-sm">
                ID de turno: {appointment_id}
              </span>
            )}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Volver al Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/payment/[token]')}
              className="w-full"
            >
              Hacer otro pago
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Serás redirigido automáticamente en unos segundos...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

