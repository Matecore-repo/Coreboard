import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Clock, DollarSign, User, Calendar, Phone, Mail } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface CheckoutSummaryProps {
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  stylistName: string | null;
  date: Date | null;
  time: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  onCreateAppointment: () => Promise<string | null>;
  loading?: boolean;
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${dayName} ${day} de ${month} de ${year}`;
}

export function CheckoutSummary({
  serviceName,
  servicePrice,
  serviceDuration,
  stylistName,
  date,
  time,
  clientName,
  clientPhone,
  clientEmail,
  onCreateAppointment,
  loading = false,
}: CheckoutSummaryProps) {
  const handleConfirm = async () => {
    const mpUrl = await onCreateAppointment();
    if (mpUrl) {
      window.location.href = mpUrl;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumen de tu reserva</CardTitle>
        <CardDescription>
          Revisa los detalles antes de confirmar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Servicio */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-start gap-4 pb-4 border-b"
        >
          <div className="p-2 bg-primary/10 rounded-lg">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{serviceName}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{serviceDuration} minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium text-foreground">
                  ${servicePrice.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Profesional */}
        {stylistName && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="flex items-start gap-4 pb-4 border-b"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Profesional</h3>
              <p className="text-sm text-muted-foreground mt-1">{stylistName}</p>
            </div>
          </motion.div>
        )}

        {/* Fecha y hora */}
        {date && time && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.2 }}
            className="flex items-start gap-4 pb-4 border-b"
          >
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Fecha y hora</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(date)} a las {time}
              </p>
            </div>
          </motion.div>
        )}

        {/* Datos del cliente */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.3 }}
          className="flex items-start gap-4 pb-4 border-b"
        >
          <div className="p-2 bg-primary/10 rounded-lg">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold">Datos de contacto</h3>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">{clientName}</p>
              {clientPhone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{clientPhone}</span>
                </div>
              )}
              {clientEmail && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{clientEmail}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Total */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.4 }}
          className="flex items-center justify-between pt-4 border-t"
        >
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold text-primary">
            ${servicePrice.toLocaleString('es-AR')}
          </span>
        </motion.div>

        {/* Botón de confirmación */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.5 }}
        >
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full h-12 text-base"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              'Confirmar y proceder al pago'
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Serás redirigido a Mercado Pago para completar el pago
          </p>
        </motion.div>
      </CardContent>
    </Card>
  );
}

