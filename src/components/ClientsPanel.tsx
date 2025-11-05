import React, { useMemo } from "react";
import { Users } from "lucide-react";
import { Appointment } from "./features/appointments/AppointmentCard";
import { useTurnos } from "../hooks/useTurnos";

interface ClientsPanelProps {
  selectedSalon: string | null;
}

export function ClientsPanel({ selectedSalon }: ClientsPanelProps) {
  // Usar useTurnos internamente como fuente única de verdad
  const { turnos } = useTurnos({
    salonId: selectedSalon === 'all' ? undefined : selectedSalon || undefined,
    enabled: true
  });
  
  // Convertir turnos a appointments para compatibilidad
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
  
  const clientsCount = useMemo(() => {
    // Si selectedSalon es 'all' o null, mostrar todos los turnos
    const salonAppointments = (!selectedSalon || selectedSalon === 'all') 
      ? appointments 
      : appointments.filter(a => a.salonId === selectedSalon);
    // Contar clientes únicos que han tenido turnos completados hoy
    const today = new Date().toISOString().split("T")[0];
    const todayAppointments = salonAppointments.filter(
      apt => apt.date === today && apt.status === "completed"
    );
    const uniqueClients = new Set(todayAppointments.map(a => a.clientName));
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


