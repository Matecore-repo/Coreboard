import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { CheckCircle2, Calendar, Clock } from 'lucide-react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { appointment_id } = router.query;

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
            Tu turno ha sido confirmado y el pago fue aprobado. Recibirás un email de confirmación con los detalles de tu reserva.
          </p>
          
          {appointment_id && (
            <div className="bg-muted p-4 rounded-md space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">ID de turno:</span>
                <span className="font-medium">{appointment_id}</span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              <Clock className="w-4 h-4 inline mr-1" />
              Recibirás un recordatorio antes de tu cita
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => router.push('/')}
              className="w-full"
            >
              Volver al inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

