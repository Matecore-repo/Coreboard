import { DollarSign, Users, Clock, MapPin, Plus } from "lucide-react";
import { Appointment } from "../features/appointments/AppointmentCard";
import { CalendarView } from "../CalendarView";
import { SalonCarousel } from "../SalonCarousel";
import { Button } from "../ui/button";
import { EmptyStateCTA } from "../EmptyStateCTA";
import { InviteEmployeeModal } from "../InviteEmployeeModal";
import { PageContainer } from "../layout/PageContainer";
import { Section } from "../layout/Section";
import { useTurnos } from "../../hooks/useTurnos";
import React, { lazy, Suspense, useState, useMemo } from "react";

const TurnosPanel = lazy(() => import("../TurnosPanel").then(m => ({ default: m.TurnosPanel })));
const ClientsPanel = lazy(() => import("../ClientsPanel").then(m => ({ default: m.ClientsPanel })));
// ServicesPanel moved to Salons Management view

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
  
  // Usar useTurnos internamente como fuente única de verdad
  const { turnos } = useTurnos({
    salonId: selectedSalon === 'all' ? undefined : selectedSalon || undefined,
    enabled: true
  });
  
  // Convertir turnos a appointments para compatibilidad con componentes internos
  const appointments = useMemo(() => {
    return turnos.map(t => ({
      id: t.id,
      clientName: t.clientName,
      service: t.service,
      date: t.date,
      time: t.time,
      status: t.status,
      stylist: t.stylist,
      salonId: t.salonId,
      notes: t.notes,
      created_by: t.created_by,
    } as Appointment));
  }, [turnos]);
  
  // HomeView muestra información del peluquero, no filtra por salón
  const salonAppointments = appointments;

  // Datos del día de hoy
  const today = new Date().toISOString().split("T")[0];
  const todayAppointments = salonAppointments.filter(
    (apt) => apt.date === today && apt.status === "completed"
  );

  // Calcular comisiones (ejemplo: $500 por cliente atendido)
  const totalCommissions = todayAppointments.length * 500;

  // Próximo turno
  const upcomingAppointments = salonAppointments
    .filter((apt) => apt.date >= today && apt.status !== "cancelled" && apt.status !== "completed")
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
  
  const nextAppointment = upcomingAppointments[0];

  // Nombre de la peluquería
  const salonNames: { [key: string]: string } = {
    "all": "Todos los locales",
    "1": "Studio Elegance",
    "2": "Barber Shop Premium",
    "3": "Beauty Salon Luxe",
    "4": "Hair Studio Pro",
  };

  // Si es usuario nuevo y no tiene datos, mostrar estado vacío
  if (isNewUser && appointments.length === 0) {
    return (
      <PageContainer>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4" role="group" aria-label="Métricas principales">
        {/* Peluquería Asignada */}
        <div className="bg-card border border-border/60 dark:border-border/40 rounded-2xl p-3" role="region" aria-label="Local seleccionado">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground truncate">Local</p>
              <p className="text-sm truncate" aria-label={`Local: ${salonNames[selectedSalon ?? 'all']}`}>
                {salonNames[selectedSalon ?? 'all']}
              </p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div className="col-span-1 md:col-span-2">Cargando...</div>}>
          <div className="col-span-1 md:col-span-1">
            <TurnosPanel selectedSalon={selectedSalon} variant="commissions" />
          </div>

          <div className="col-span-1 md:col-span-1">
            <ClientsPanel selectedSalon={selectedSalon} />
          </div>

          <div className="col-span-1 md:col-span-2">
            <TurnosPanel selectedSalon={selectedSalon} variant="next" />
          </div>

          {/* Servicios: movidos al módulo de Peluquerías */}
        </Suspense>
        </div>

        {/* Calendario */}
        <section className="mt-4" role="region" aria-label="Calendario de turnos" data-section="calendar">
          <CalendarView 
            selectedSalon={selectedSalon}
            focusDate={null}
            onAppointmentClick={onAppointmentClick}
          />
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
