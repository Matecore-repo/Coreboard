import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { usePublicCheckout } from '../../hooks/usePublicCheckout';
import { ServiceSelector } from './ServiceSelector';
import { StylistSelector } from './StylistSelector';
import { DateTimeSelector } from './DateTimeSelector';
import { CustomerInfoForm } from './CustomerInfoForm';
import { CheckoutSummary } from './CheckoutSummary';
import { cn } from '../ui/utils';

interface PublicCheckoutViewProps {
  token: string;
}

const STEPS = [
  { id: 1, name: 'Servicio', description: 'Selecciona el servicio' },
  { id: 2, name: 'Profesional', description: 'Elige un profesional (opcional)' },
  { id: 3, name: 'Fecha y hora', description: 'Selecciona fecha y hora' },
  { id: 4, name: 'Datos personales', description: 'Completa tus datos' },
  { id: 5, name: 'Confirmar', description: 'Revisa y confirma' },
];

export function PublicCheckoutView({ token }: PublicCheckoutViewProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const {
    config,
    services,
    stylists,
    timeSlots,
    checkoutData,
    setCheckoutData,
    loading,
    error,
    createAppointment,
  } = usePublicCheckout(token);

  if (loading.config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-destructive">Error</CardTitle>
            <CardDescription>
              {error || 'No se pudo cargar la configuración del link'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              El link de pago no es válido o ha expirado. Por favor, contacta con el establecimiento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedService = services.find(s => s.id === checkoutData.serviceId);
  const selectedStylist = checkoutData.stylistId
    ? stylists.find(s => s.id === checkoutData.stylistId)
    : null;

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return !!checkoutData.serviceId;
      case 2:
        return true; // Opcional
      case 3:
        return !!checkoutData.date && !!checkoutData.time;
      case 4:
        return !!checkoutData.clientName.trim();
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canGoNext() && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateAppointment = async () => {
    return await createAppointment();
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">{config.title}</h1>
          {config.description && (
            <p className="text-center text-muted-foreground">{config.description}</p>
          )}
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const stepNumber = index + 1;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className="flex items-center w-full">
                      <div className="flex items-center justify-center">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                            isCompleted
                              ? 'bg-primary border-primary text-primary-foreground'
                              : isActive
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground text-muted-foreground'
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <span className="font-semibold">{stepNumber}</span>
                          )}
                        </div>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div
                          className={cn(
                            'h-1 flex-1 mx-2 transition-all',
                            isCompleted ? 'bg-primary' : 'bg-muted'
                          )}
                        />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p
                        className={cn(
                          'text-xs font-medium',
                          isActive ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      >
                        {step.name}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 1 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">{STEPS[0].name}</h2>
                <ServiceSelector
                  services={services}
                  selectedServiceId={checkoutData.serviceId}
                  onSelect={(serviceId) =>
                    setCheckoutData({ ...checkoutData, serviceId })
                  }
                  loading={loading.services}
                />
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">{STEPS[1].name}</h2>
                <StylistSelector
                  stylists={stylists}
                  selectedStylistId={checkoutData.stylistId}
                  onSelect={(stylistId) =>
                    setCheckoutData({ ...checkoutData, stylistId })
                  }
                  loading={loading.stylists}
                />
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">{STEPS[2].name}</h2>
                <DateTimeSelector
                  selectedDate={checkoutData.date}
                  selectedTime={checkoutData.time}
                  timeSlots={timeSlots}
                  onDateSelect={(date) =>
                    setCheckoutData({ ...checkoutData, date, time: null })
                  }
                  onTimeSelect={(time) =>
                    setCheckoutData({ ...checkoutData, time })
                  }
                  loading={loading.availability}
                />
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">{STEPS[3].name}</h2>
                <CustomerInfoForm
                  clientName={checkoutData.clientName}
                  clientPhone={checkoutData.clientPhone}
                  clientEmail={checkoutData.clientEmail}
                  onNameChange={(name) =>
                    setCheckoutData({ ...checkoutData, clientName: name })
                  }
                  onPhoneChange={(phone) =>
                    setCheckoutData({ ...checkoutData, clientPhone: phone })
                  }
                  onEmailChange={(email) =>
                    setCheckoutData({ ...checkoutData, clientEmail: email })
                  }
                />
              </div>
            )}

            {currentStep === 5 && selectedService && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">{STEPS[4].name}</h2>
                <CheckoutSummary
                  serviceName={selectedService.name}
                  servicePrice={selectedService.price}
                  serviceDuration={selectedService.duration_minutes}
                  stylistName={selectedStylist?.full_name || null}
                  date={checkoutData.date}
                  time={checkoutData.time}
                  clientName={checkoutData.clientName}
                  clientPhone={checkoutData.clientPhone}
                  clientEmail={checkoutData.clientEmail}
                  onCreateAppointment={handleCreateAppointment}
                  loading={loading.creating}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>

          {currentStep < STEPS.length && (
            <Button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="flex items-center gap-2"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

