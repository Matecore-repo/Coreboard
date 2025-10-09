import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Appointment } from "./AppointmentCard";

interface CalendarViewProps {
  appointments: Appointment[];
  selectedSalon: string;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export function CalendarView({ appointments, selectedSalon, onAppointmentClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getAppointmentsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return appointments.filter(
      apt => apt.date === dateStr && (selectedSalon === "all" || apt.salonId === selectedSalon)
    );
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const selectedDayAppointments = selectedDay ? getAppointmentsForDay(selectedDay) : [];

  const statusColors = {
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    confirmed: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    completed: "bg-green-500/10 text-green-700 dark:text-green-400",
    cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Calendar Grid */}
      <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-4">
          <h3>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={previousMonth}
              className="h-8 w-8 rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-8 w-8 rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-muted-foreground p-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dayAppointments = getAppointmentsForDay(day);
            const hasAppointments = dayAppointments.length > 0;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`aspect-square rounded-xl p-2 transition-all relative ${
                  isToday(day)
                    ? "bg-primary text-primary-foreground"
                    : selectedDay === day
                    ? "bg-accent ring-2 ring-primary"
                    : hasAppointments
                    ? "bg-muted/50 hover:bg-muted"
                    : "hover:bg-muted/30"
                }`}
              >
                <span className="text-sm">{day}</span>
                {hasAppointments && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayAppointments.slice(0, 3).map((apt, i) => (
                      <div
                        key={i}
                        className={`h-1 w-1 rounded-full ${
                          apt.status === "confirmed"
                            ? "bg-blue-500"
                            : apt.status === "pending"
                            ? "bg-yellow-500"
                            : apt.status === "completed"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Details */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col max-h-[600px]">
        <h3 className="mb-4">
          {selectedDay
            ? `${selectedDay} de ${monthNames[currentDate.getMonth()]}`
            : "Selecciona un día"}
        </h3>

        {selectedDayAppointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay turnos para este día
          </div>
        ) : (
          <div className="space-y-3 flex-1 overflow-y-auto">
            {selectedDayAppointments
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() => onAppointmentClick?.(appointment)}
                  className="p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{appointment.clientName}</span>
                    </div>
                    <Badge className={`${statusColors[appointment.status]} text-xs`}>
                      {appointment.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{appointment.time}</span>
                  </div>
                  <p className="text-muted-foreground">{appointment.service}</p>
                  <p className="text-muted-foreground">
                    {appointment.stylist}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
