import { DollarSign, Users, Clock, MapPin, Plus, Sparkles } from "lucide-react";
import { Appointment } from "../features/appointments/AppointmentCard";
import { SalonCarousel } from "../SalonCarousel";
import { Button } from "../ui/button";
import { EmptyStateCTA } from "../EmptyStateCTA";
import { InviteEmployeeModal } from "../InviteEmployeeModal";
import { PageContainer } from "../layout/PageContainer";
import { Section } from "../layout/Section";
import { useTurnos } from "../../hooks/useTurnos";
import React, { useState, useMemo } from "react";
import { ShortcutBanner } from "../ShortcutBanner";
import { useCommandPalette } from "../../contexts/CommandPaletteContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface Salon {
  id: string;
  name: string;
  address: string;
  image: string;
  staff?: string[];
}

interface HomeViewProps {
  selectedSalon: string | null;
  salons: Salon[];
  onSelectSalon: (id: string, name: string) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  onAddAppointment?: () => void;
  orgName?: string;
  isNewUser?: boolean;
}

export default function HomeView({ selectedSalon, salons, onSelectSalon, onAppointmentClick, onAddAppointment, orgName, isNewUser }: HomeViewProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const palette = useCommandPalette(true);
  
  const { turnos, loading: loadingTurnos } = useTurnos({
    enabled: true,
  });

  const appointments = useMemo<Appointment[]>(() => {
    return turnos.map((t) => ({
      id: t.id,
      clientName: t.clientName,
      service: t.service,
      serviceName: t.serviceName,
      servicePrice: t.servicePrice,
      date: t.date,
      time: t.time,
      status: t.status,
      stylist: t.stylist,
      salonId: t.salonId,
      notes: t.notes,
      created_by: t.created_by,
    }));
  }, [turnos]);

  const salonAppointments = useMemo<Appointment[]>(() => {
    if (!selectedSalon || selectedSalon === "all") {
      return appointments;
    }
    return appointments.filter((appointment) => appointment.salonId === selectedSalon);
  }, [appointments, selectedSalon]);

  // Datos del día de hoy
  const today = new Date().toISOString().split("T")[0];
  const pendingAppointments = salonAppointments.filter((apt) => apt.status === "pending");
  const confirmedAppointments = salonAppointments.filter((apt) => apt.status === "confirmed");
  const completedToday = salonAppointments.filter(
    (apt) => apt.status === "completed" && apt.date === today,
  );

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return salonAppointments
      .filter((apt) => {
        const dateTime = new Date(`${apt.date}T${apt.time}`);
        return dateTime >= now;
      })
      .slice(0, 3);
  }, [salonAppointments]);

  const metrics: Array<{
    label: string;
    value: number;
    icon: React.ReactNode;
    trendLabel?: string;
  }> = [
    {
      label: "Turnos pendientes",
      value: pendingAppointments.length,
      icon: <Clock className="h-5 w-5 text-amber-500" aria-hidden="true" />,
    },
    {
      label: "Turnos confirmados",
      value: confirmedAppointments.length,
      icon: <Users className="h-5 w-5 text-blue-500" aria-hidden="true" />,
    },
    {
      label: "Atendidos hoy",
      value: completedToday.length,
      icon: <DollarSign className="h-5 w-5 text-emerald-500" aria-hidden="true" />,
    },
  ];

  const salonNames = useMemo(() => {
    const map: Record<string, string> = {
      all: "Todos los locales",
    };
    salons.forEach((salon) => {
      map[salon.id] = salon.name;
    });
    return map;
  }, [salons]);

  const currentSalonName = useMemo(() => {
    if (selectedSalon === "all") {
      return salonNames.all;
    }
    if (!selectedSalon) {
      return "Selecciona un local";
    }
    return salonNames[selectedSalon] ?? "Local sin nombre";
  }, [selectedSalon, salonNames]);

  // Si es usuario nuevo y no tiene datos, mostrar estado vacío
  if (isNewUser && appointments.length === 0) {
    return (
      <PageContainer>
        <ShortcutBanner
          icon={<Sparkles className="size-4 text-primary" aria-hidden="true" />}
          message={(
            <>
              Usa <span className="font-semibold">Ctrl + K</span> o <span className="font-semibold">Ctrl + B</span> para abrir la paleta de comandos.
            </>
          )}
          onShortcutClick={palette?.openPalette}
        />
        <section className="text-center mb-8" role="region" aria-label="Bienvenida">
          <h1 className="text-2xl font-semibold mb-2">¡Bienvenido a {orgName || 'tu local'}!</h1>
          <p className="text-muted-foreground">Empezá a configurar tu negocio con estos pasos:</p>
        </section>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto" role="group" aria-label="Opciones de configuración inicial">
          <EmptyStateCTA
            type="appointments"
            onAction={onAddAppointment || (() => {})}
            orgName={orgName}
          />
          
          <EmptyStateCTA
            type="employees"
            onAction={() => setShowInviteModal(true)}
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ShortcutBanner
        icon={<Sparkles className="size-4 text-primary" aria-hidden="true" />}
        message={(
          <>
            Usa <span className="font-semibold">Ctrl + K</span> o <span className="font-semibold">Ctrl + B</span> para abrir la paleta de comandos.
          </>
        )}
        onShortcutClick={palette?.openPalette}
      />
      <Section 
        title="Mis Locales"
        action={onAddAppointment && (
          <Button 
            onClick={onAddAppointment}
            aria-label="Crear nuevo turno"
            data-action="new-appointment"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Nuevo Turno
          </Button>
        )}
      >
        <div className="mt-4 mb-4" role="region" aria-label="Selector de locales">
          <SalonCarousel 
            salons={salons}
            selectedSalon={selectedSalon}
            onSelectSalon={onSelectSalon}
          />
        </div>
      </Section>

      <section className="mt-4 gap-4 p-4 sm:p-6" aria-label="Panel principal">
        {/* Header con métricas */}
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-4"
          role="group"
          aria-label="Métricas principales"
        >
          <Card
            className="border-border/60 dark:border-border/40"
            role="region"
            aria-label="Local seleccionado"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Local seleccionado</CardTitle>
              <MapPin className="h-5 w-5 text-purple-500" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <p className="text-base font-semibold" aria-label={`Local: ${currentSalonName}`}>
                {currentSalonName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cambiá el local desde el carrusel superior para ajustar los números.
              </p>
            </CardContent>
          </Card>

          {metrics.map((metric) => (
            <Card key={metric.label} className="border-border/60 dark:border-border/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                {metric.icon}
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{metric.value}</p>
                {metric.trendLabel && (
                  <p className="text-xs text-muted-foreground mt-1">{metric.trendLabel}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <section
          className="mt-6 grid gap-4 lg:grid-cols-3"
          role="region"
          aria-label="Próximos turnos y actividad reciente"
        >
          <Card className="lg:col-span-2 border-border/60 dark:border-border/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-medium">Próximos turnos</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Los próximos tres turnos confirmados o pendientes se muestran acá.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={onAddAppointment}
                aria-label="Crear nuevo turno desde el inicio"
              >
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                Nuevo turno
              </Button>
            </CardHeader>
            <CardContent>
              {loadingTurnos ? (
                <p className="text-sm text-muted-foreground">Cargando turnos…</p>
              ) : upcomingAppointments.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No hay turnos futuros para mostrar. Creá uno nuevo o revisá tu agenda completa.
                </div>
              ) : (
                <ul className="space-y-3" role="list">
                  {upcomingAppointments.map((appointment) => {
                    const dateTime = new Date(`${appointment.date}T${appointment.time}`);
                    const formattedDate = dateTime.toLocaleDateString("es-AR", {
                      day: "2-digit",
                      month: "short",
                    });
                    const formattedTime = dateTime.toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <li
                        key={appointment.id}
                        className="flex items-center justify-between rounded-xl border border-border/60 bg-card/70 px-3 py-3 text-sm transition-colors hover:bg-card"
                        role="listitem"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {appointment.clientName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {appointment.serviceName || appointment.service || "Servicio sin definir"}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formattedTime}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            {formattedDate}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 dark:border-border/40">
            <CardHeader>
              <CardTitle className="text-base font-medium">Resumen rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Turnos totales</span>
                <span className="font-semibold">{salonAppointments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Clientes distintos</span>
                <span className="font-semibold">
                  {new Set(salonAppointments.map((apt) => apt.clientName)).size}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Última actualización</span>
                <span className="font-semibold">
                  {new Date().toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Podés gestionar la agenda completa desde la sección{" "}
                <span className="font-medium text-foreground">Turnos</span>. Este resumen solo
                muestra la actividad más relevante.
              </p>
            </CardContent>
          </Card>
        </section>
      </section>

      {/* Invite Employee Modal */}
      <InviteEmployeeModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </PageContainer>
  );
}
