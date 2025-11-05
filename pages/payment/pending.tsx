import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Clock, Mail, Calendar } from 'lucide-react';

export default function PaymentPendingPage() {
  const router = useRouter();
  const { appointment_id } = router.query;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-yellow-600 animate-pulse" />
          </div>
          <CardTitle className="text-2xl">Pago pendiente</CardTitle>
          <CardDescription>
            Tu pago está siendo procesado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Estamos procesando tu pago. Te notificaremos por email cuando se complete y tu turno quede confirmado.
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

          <div className="bg-muted/50 p-4 rounded-md border border-muted">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">¿Qué sigue?</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                  <li>Revisa tu email para actualizaciones</li>
                  <li>Tu turno quedará pendiente hasta que se procese el pago</li>
                  <li>Recibirás una confirmación cuando el pago sea aprobado</li>
                </ul>
              </div>
            </div>
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

