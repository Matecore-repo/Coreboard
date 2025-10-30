import React, { useMemo } from "react";
import { Users } from "lucide-react";
import { Appointment } from "./features/appointments/AppointmentCard";

interface ClientsPanelProps {
  appointments: Appointment[];
  selectedSalon: string | null;
}

export function ClientsPanel({ appointments, selectedSalon }: ClientsPanelProps) {
  const clientsCount = useMemo(() => {
    const salonAppointments = !selectedSalon ? appointments : appointments.filter(a => a.salonId === selectedSalon);
    const uniqueClients = new Set(salonAppointments.map(a => a.clientName));
    return uniqueClients.size;
  }, [appointments, selectedSalon]);

  return (
    <div className="bg-card border border-border rounded-2xl p-3">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate">Clientes Atendidos</p>
          <p className="font-medium">{clientsCount}</p>
        </div>
      </div>
    </div>
  );
}

export default ClientsPanel;


