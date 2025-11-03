import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Clock } from 'lucide-react';

export default function PaymentPendingPage() {
  const router = useRouter();
  const { appointment_id } = router.query;

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
          <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl">Pago pendiente</CardTitle>
          <CardDescription>
            Tu pago está siendo procesado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Estamos procesando tu pago. Te notificaremos cuando se complete.
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
              onClick={() => router.push('/dashboard?view=appointments')}
              className="w-full"
            >
              Ver mis turnos
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

