import { DollarSign, Users, Clock, MapPin, Plus } from "lucide-react";
import { Appointment } from "../features/appointments/AppointmentCard";
import { CalendarView } from "../CalendarView";
import { SalonCarousel } from "../SalonCarousel";
import { Button } from "../ui/button";
import { EmptyStateCTA } from "../EmptyStateCTA";
import { InviteEmployeeModal } from "../InviteEmployeeModal";
import { PageContainer } from "../layout/PageContainer";
import { Section } from "../layout/Section";
import React, { lazy, Suspense, useState } from "react";

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
  appointments: Appointment[];
  selectedSalon: string | null;
  salons: Salon[];
  onSelectSalon: (id: string, name: string) => void;
  onAppointmentClick?: (appointment: Appointment) => void;
  onAddAppointment?: () => void;
  orgName?: string;
  isNewUser?: boolean;
}

export default function HomeView({ appointments, selectedSalon, salons, onSelectSalon, onAppointmentClick, onAddAppointment, orgName, isNewUser }: HomeViewProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  
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
    "all": "Todas las peluquerías",
    "1": "Studio Elegance",
    "2": "Barber Shop Premium",
    "3": "Beauty Salon Luxe",
    "4": "Hair Studio Pro",
  };

  // Si es usuario nuevo y no tiene datos, mostrar estado vacío
  if (isNewUser && appointments.length === 0) {
    return (
      <PageContainer>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2">¡Bienvenido a {orgName || 'tu peluquería'}!</h1>
          <p className="text-muted-foreground">Empezá a configurar tu negocio con estos pasos:</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
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
        title="Mis Peluquerías"
        action={onAddAppointment && (
          <Button onClick={onAddAppointment}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Turno
          </Button>
        )}
      >
        <SalonCarousel 
          salons={salons}
          selectedSalon={selectedSalon}
          onSelectSalon={onSelectSalon}
        />
      </Section>

      <div className="mt-4 md:mt-5">
        {/* Header con métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 md:mb-5">
        {/* Peluquería Asignada */}
        <div className="bg-card border border-border/60 dark:border-border/40 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground truncate">Peluquería</p>
              <p className="text-sm truncate">{salonNames[selectedSalon ?? 'all']}</p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div className="col-span-1 md:col-span-2">Cargando...</div>}>
          <div className="col-span-1 md:col-span-1">
            <TurnosPanel appointments={appointments} selectedSalon={selectedSalon} variant="commissions" />
          </div>

          <div className="col-span-1 md:col-span-1">
            <ClientsPanel appointments={appointments} selectedSalon={selectedSalon} />
          </div>

          <div className="col-span-1 md:col-span-2">
            <TurnosPanel appointments={appointments} selectedSalon={selectedSalon} variant="next" />
          </div>

          {/* Servicios: movidos al módulo de Peluquerías */}
        </Suspense>
        </div>

        {/* Calendario */}
        <div className="px-0 md:px-0">
          <CalendarView 
          appointments={appointments} 
          selectedSalon={selectedSalon}
          focusDate={null}
            onAppointmentClick={onAppointmentClick}
          />
        </div>
      </div>

      {/* Invite Employee Modal */}
      <InviteEmployeeModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </PageContainer>
  );
}
