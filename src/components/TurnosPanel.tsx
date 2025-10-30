import React, { useEffect, useState } from "react";
import { DollarSign, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Appointment } from "./features/appointments/AppointmentCard";

interface TurnosPanelProps {
  appointments: Appointment[];
  selectedSalon: string | null;
  variant?: "all" | "commissions" | "next";
}

export function TurnosPanel({ appointments, selectedSalon, variant = "all" }: TurnosPanelProps) {
  const [commissions, setCommissions] = useState(0);
  const [nextAppointmentTime, setNextAppointmentTime] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const salonAppointments = !selectedSalon ? appointments : appointments.filter(a => a.salonId === selectedSalon);

    const todayCompleted = salonAppointments.filter(apt => apt.date === today && apt.status === "completed");
    setCommissions(todayCompleted.length * 500);

    const upcoming = salonAppointments
      .filter(apt => apt.date >= today && apt.status !== "cancelled" && apt.status !== "completed")
      .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)));

    setNextAppointmentTime(upcoming.length > 0 ? upcoming[0].time : null);
  }, [appointments, selectedSalon]);

  const CommissionsCard = (
    <div className="bg-card border border-border rounded-2xl p-3">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate">Comisiones Hoy</p>
          <p className="font-medium">${commissions}</p>
        </div>
      </div>
    </div>
  );

  const NextCard = (
    <div className="bg-card border border-border rounded-2xl p-3">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
          <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate">Próximo Turno</p>
          <p className="font-medium truncate">{nextAppointmentTime || "Sin turnos"}</p>
        </div>
      </div>
    </div>
  );

  if (variant === "commissions") return CommissionsCard;
  if (variant === "next") return NextCard;

  return (
    <>
      {CommissionsCard}
      {NextCard}
    </>
  );
}

export default TurnosPanel;


