import { DollarSign, Users, Clock, MapPin, Plus } from "lucide-react";
import { Appointment } from "../AppointmentCard";
import { CalendarView } from "../CalendarView";
import { SalonCarousel } from "../SalonCarousel";
import { Button } from "../ui/button";

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
}

export function HomeView({ appointments, selectedSalon, salons, onSelectSalon, onAppointmentClick, onAddAppointment }: HomeViewProps) {
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
              <p className="font-medium truncate">{salonNames[selectedSalon]}</p>
            </div>
          </div>
        </div>

        {/* Comisiones del día */}
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground truncate">Comisiones Hoy</p>
              <p className="font-medium">${totalCommissions}</p>
            </div>
          </div>
        </div>

        {/* Clientes atendidos */}
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground truncate">Clientes Atendidos</p>
              <p className="font-medium">{todayAppointments.length}</p>
            </div>
          </div>
        </div>

        {/* Próximo turno - hora */}
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground truncate">Próximo Turno</p>
              <p className="font-medium truncate">
                {nextAppointment ? nextAppointment.time : "Sin turnos"}
              </p>
            </div>
          </div>
        </div>
      </div>

        {/* Calendario */}
        <CalendarView 
          appointments={appointments} 
          selectedSalon={selectedSalon}
          onAppointmentClick={onAppointmentClick}
        />
      </div>
    </div>
  );
}
