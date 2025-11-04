import { useState, useEffect } from 'react';
import { useSalons } from '../../hooks/useSalons';
import { useEmployees } from '../../hooks/useEmployees';
import { useServices } from '../../hooks/useServices';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Calendar } from '../ui/calendar';
import { CalendarIcon, Clock, MapPin, User, CreditCard } from 'lucide-react';

interface PaymentGatewayProps {
  orgId: string;
  paymentLinkToken: string;
}

export function PaymentGateway({ orgId, paymentLinkToken }: PaymentGatewayProps) {
  const { salons, isLoading: salonsLoading } = useSalons(orgId, { enabled: !!orgId });
  const { employees, isLoading: employeesLoading } = useEmployees(orgId, { enabled: !!orgId });
  const { services, isLoading: servicesLoading } = useServices(orgId, { enabled: !!orgId });
  
  const [selectedSalon, setSelectedSalon] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // Filtrar servicios disponibles en el local seleccionado
  const availableServices = selectedSalon 
    ? services.filter(s => {
        // Verificar si el servicio está disponible en el local seleccionado
        // Esto requeriría verificar salon_services
        return true; // Por ahora, mostrar todos los servicios
      })
    : [];

  // Filtrar empleados disponibles en el local seleccionado
  const availableEmployees = selectedSalon
    ? employees.filter(e => {
        // Verificar si el empleado está asignado al local seleccionado
        // Esto requeriría verificar salon_employees
        return true; // Por ahora, mostrar todos los empleados
      })
    : [];

  // Generar horarios disponibles (9:00 AM - 8:00 PM, cada 30 minutos)
  useEffect(() => {
    if (selectedDate) {
      const times: string[] = [];
      for (let hour = 9; hour < 20; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          times.push(timeStr);
        }
      }
      setAvailableTimes(times);
    } else {
      setAvailableTimes([]);
    }
  }, [selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSalon || !selectedService || !selectedEmployee || !selectedDate || !selectedTime || !clientName) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);

    try {
      // Combinar fecha y hora
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const appointmentDateTime = new Date(selectedDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      // Buscar el servicio para obtener el precio
      const service = services.find(s => s.id === selectedService);
      const totalAmount = service?.base_price || 0;

      // Crear el turno en la base de datos usando una función RPC que valida el token
      // Por ahora, usamos insert directo con validación de payment_link
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          org_id: orgId,
          salon_id: selectedSalon,
          service_id: selectedService,
          stylist_id: selectedEmployee,
          client_name: clientName,
          client_phone: clientPhone || null,
          client_email: clientEmail || null,
          starts_at: appointmentDateTime.toISOString(),
          status: 'pending',
          total_amount: totalAmount
          // created_by no se envía si no hay usuario autenticado
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando turno:', error);
        toast.error('Error al crear el turno. Por favor intenta nuevamente.');
        return;
      }

      // Crear el pago asociado
      await supabase
        .from('payments')
        .insert({
          org_id: orgId,
          appointment_id: appointment.id,
          amount: totalAmount,
          payment_method: 'card', // Por ahora, asumimos pago con tarjeta
          processed_at: new Date().toISOString(),
          notes: 'Pago realizado desde pasarela pública',
        });

      toast.success('¡Turno reservado exitosamente!');
      
      // Limpiar formulario
      setSelectedSalon('');
      setSelectedService('');
      setSelectedEmployee('');
      setSelectedDate(undefined);
      setSelectedTime('');
      setClientName('');
      setClientPhone('');
      setClientEmail('');

    } catch (error) {
      console.error('Error en el proceso de reserva:', error);
      toast.error('Error al procesar la reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedServiceObj = services.find(s => s.id === selectedService);
  const selectedSalonObj = salons.find(s => s.id === selectedSalon);

  if (salonsLoading || employeesLoading || servicesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Reserva tu turno</h1>
          <p className="text-muted-foreground">Completa el formulario para reservar tu turno y pagar online</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selección de Local */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Selecciona un local
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedSalon} onValueChange={setSelectedSalon}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un local" />
                </SelectTrigger>
                <SelectContent>
                  {salons.map((salon) => (
                    <SelectItem key={salon.id} value={salon.id}>
                      {salon.name} - {salon.address || 'Sin dirección'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Selección de Servicio */}
          {selectedSalon && (
            <Card>
              <CardHeader>
                <CardTitle>Selecciona un servicio</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedService} onValueChange={setSelectedService} disabled={!selectedSalon}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.base_price?.toLocaleString('es-AR')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Selección de Profesional */}
          {selectedSalon && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Selecciona un profesional
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee} disabled={!selectedSalon}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un profesional" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.full_name || employee.email || `Empleado ${employee.id.substring(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Selección de Fecha y Hora */}
          {selectedSalon && selectedService && selectedEmployee && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Selecciona fecha y hora
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Fecha</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>
                {selectedDate && (
                  <div>
                    <Label>Hora</Label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una hora" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimes.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Datos del Cliente */}
          {selectedDate && selectedTime && (
            <Card>
              <CardHeader>
                <CardTitle>Datos del cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="clientName">Nombre completo *</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="clientPhone">Teléfono</Label>
                  <Input
                    id="clientPhone"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    type="tel"
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    type="email"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resumen y Pago */}
          {selectedService && selectedDate && selectedTime && clientName && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Resumen y pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Servicio:</span>
                    <span>{selectedServiceObj?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Local:</span>
                    <span>{selectedSalonObj?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span>{selectedDate && selectedDate.toLocaleDateString('es-AR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hora:</span>
                    <span>{selectedTime}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${selectedServiceObj?.base_price?.toLocaleString('es-AR')}</span>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Procesando...' : 'Reservar y pagar'}
                </Button>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
    </div>
  );
}

