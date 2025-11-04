import React, { useEffect, useState, useMemo } from "react";
import { DollarSign, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Appointment } from "./features/appointments/AppointmentCard";
import { useCommissions } from "../hooks/useCommissions";
import { useAuth } from "../contexts/AuthContext";
import { useEmployees } from "../hooks/useEmployees";

interface TurnosPanelProps {
  appointments: Appointment[];
  selectedSalon: string | null;
  variant?: "all" | "commissions" | "next";
}

export function TurnosPanel({ appointments, selectedSalon, variant = "all" }: TurnosPanelProps) {
  const [nextAppointmentTime, setNextAppointmentTime] = useState<string | null>(null);
  const { user, currentOrgId } = useAuth();
  const { commissions, loading: loadingCommissions } = useCommissions({ enabled: true });
  const { employees } = useEmployees(currentOrgId ?? undefined, { enabled: true });

  // Encontrar el empleado actual por user_id
  const currentEmployee = useMemo(() => {
    if (!user?.id) return null;
    return employees.find(emp => emp.user_id === user.id);
  }, [employees, user?.id]);

  // Calcular comisiones del día de hoy
  const todayCommissions = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayComms = commissions.filter(comm => {
      const commDate = new Date(comm.date).toISOString().split("T")[0];
      if (commDate !== today) return false;
      // Si hay un empleado actual, filtrar solo sus comisiones
      if (currentEmployee) {
        return comm.employee_id === currentEmployee.id;
      }
      return true;
    });
    return todayComms.reduce((sum, comm) => sum + comm.amount, 0);
  }, [commissions, currentEmployee]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const salonAppointments = !selectedSalon ? appointments : appointments.filter(a => a.salonId === selectedSalon);

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
          <p className="font-medium">${todayCommissions.toFixed(2)}</p>
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


