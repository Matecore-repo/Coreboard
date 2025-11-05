import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { XCircle, AlertCircle, Phone } from 'lucide-react';

export default function PaymentFailurePage() {
  const router = useRouter();
  const { appointment_id, status, status_detail } = router.query;

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
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Estado: {status}</p>
                  {status_detail && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Detalle: {status_detail}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {appointment_id && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm text-muted-foreground text-center">
                ID de turno: <span className="font-medium">{appointment_id}</span>
              </p>
            </div>
          )}

          <div className="bg-muted/50 p-4 rounded-md border border-muted">
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">¿Necesitas ayuda?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Contacta con el establecimiento para obtener asistencia o intentar con otro método de pago.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => router.back()}
              className="w-full"
            >
              Intentar nuevamente
            </Button>
            <Button
              variant="outline"
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

