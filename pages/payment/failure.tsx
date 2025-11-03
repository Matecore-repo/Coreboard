import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { XCircle } from 'lucide-react';

export default function PaymentFailurePage() {
  const router = useRouter();
  const { appointment_id, status, status_detail } = router.query;

  useEffect(() => {
    // Redirigir al dashboard después de 10 segundos
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 10000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Pago rechazado</CardTitle>
          <CardDescription>
            No pudimos procesar tu pago
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            El pago no pudo ser procesado. Por favor, intenta nuevamente o usa otro método de pago.
          </p>
          {status && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium">Estado: {status}</p>
              {status_detail && (
                <p className="text-xs text-muted-foreground mt-1">
                  Detalle: {status_detail}
                </p>
              )}
            </div>
          )}
          {appointment_id && (
            <p className="text-center text-sm text-muted-foreground">
              ID de turno: {appointment_id}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Volver al Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="w-full"
            >
              Intentar nuevamente
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

