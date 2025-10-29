import { DollarSign, Users, Clock, MapPin, Plus } from "lucide-react";
import { Appointment } from "../AppointmentCard";
import { CalendarView } from "../CalendarView";
import { SalonCarousel } from "../SalonCarousel";
import { Button } from "../ui/button";
import { EmptyStateCTA } from "../EmptyStateCTA";
import { InviteEmployeeModal } from "../InviteEmployeeModal";
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
      <div className="pb-20">
        <div className="p-4 md:p-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">¡Bienvenido a {orgName || 'tu peluquería'}!</h1>
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
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Salon Carousel */}
      <div className="p-4 md:p-6 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3">
          <h2>Mis Peluquerías</h2>
          {onAddAppointment && (
            <Button onClick={onAddAppointment} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Turno
            </Button>
          )}
        </div>
        <SalonCarousel 
          salons={salons}
          selectedSalon={selectedSalon}
          onSelectSalon={onSelectSalon}
        />
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {/* Header con métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Peluquería Asignada */}
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground truncate">Peluquería</p>
              <p className="font-medium truncate">{salonNames[selectedSalon ?? 'all']}</p>
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
        <CalendarView 
          appointments={appointments} 
          selectedSalon={selectedSalon}
          focusDate={null}
          onAppointmentClick={onAppointmentClick}
        />

        {/* Invite Employee Modal */}
        <InviteEmployeeModal 
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
        />
      </div>
    </div>
  );
}
