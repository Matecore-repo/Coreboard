import React, { useState, memo, useEffect, startTransition } from "react";
import { ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Appointment } from "./features/appointments/AppointmentCard";
import type { TurnosSharedProps } from "../types/turnos-shared";

interface CalendarViewProps {
  data: Pick<TurnosSharedProps, "appointments" | "isLoading">;
  selectedSalon: string | null;
  focusDate?: string | null;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export const CalendarView = memo(function CalendarView({ data, selectedSalon, focusDate, onAppointmentClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    if (focusDate) return new Date(focusDate);
    return new Date();
  });

  // When focusDate changes, update currentDate to that month
  useEffect(() => {
    if (!focusDate) return;
    const f = new Date(focusDate);
    if (Number.isNaN(f.getTime())) return;
    if (f.getMonth() !== currentDate.getMonth() || f.getFullYear() !== currentDate.getFullYear()) {
      startTransition(() => {
        setCurrentDate(f);
      });
    }
  }, [focusDate, currentDate]);

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
    if (!data || !data.appointments) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return data.appointments.filter(
      (apt) =>
        apt.date === dateStr &&
        (!selectedSalon || selectedSalon === "all" || apt.salonId === selectedSalon),
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
      <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={previousMonth}
              className="h-6 w-6 rounded-full"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="h-6 w-6 rounded-full"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-2 mb-3">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-muted-foreground text-xs p-2"
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
                className={`aspect-square rounded-lg p-2 transition-all relative text-xs ${
                  isToday(day)
                    ? "bg-primary text-primary-foreground"
                    : selectedDay === day
                    ? "bg-accent ring-2 ring-primary"
                    : hasAppointments
                    ? "bg-muted/50 hover:bg-muted"
                    : "hover:bg-muted/30"
                }`}
              >
                <span className="text-xs font-medium">{day}</span>
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
      <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4 flex flex-col max-h-[500px]">
        <h3 className="mb-4 text-sm font-semibold">
          {selectedDay
            ? `${selectedDay} de ${monthNames[currentDate.getMonth()]}`
            : "Selecciona un día"}
        </h3>

        {!data || data.isLoading ? (
          <div className="text-center py-6 text-muted-foreground text-sm">Cargando turnos...</div>
        ) : selectedDayAppointments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No hay turnos para este día
          </div>
        ) : (
          <div className="space-y-2 flex-1 overflow-y-auto">
            {selectedDayAppointments
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() => onAppointmentClick?.(appointment)}
                  className="p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-sm">{appointment.clientName}</span>
                    </div>
                    <Badge className={`${statusColors[appointment.status]} text-xs`}>
                      {appointment.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground mb-0.5 text-xs">
                    <Clock className="h-3 w-3" />
                    <span>{appointment.time}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">{appointment.service}</p>
                  <p className="text-muted-foreground text-xs">
                    {appointment.stylist}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
});
