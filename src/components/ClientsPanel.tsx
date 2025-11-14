import React, { useMemo } from "react";
import { Users } from "lucide-react";
import type { TurnosSharedProps } from "../types/turnos-shared";

interface ClientsPanelProps {
  data: Pick<TurnosSharedProps, "salonAppointments" | "isLoading">;
}

export function ClientsPanel({ data }: ClientsPanelProps) {
  const clientsCount = useMemo(() => {
    if (!data || data.isLoading) {
      return null;
    }

    const today = new Date().toISOString().split("T")[0];
    const todayAppointments = (data.salonAppointments || []).filter(
      (apt) => apt.date === today && apt.status === "completed",
    );
    const uniqueClients = new Set(todayAppointments.map((a) => a.clientName));
    return uniqueClients.size;
  }, [data?.isLoading, data?.salonAppointments]);

  return (
    <div className="bg-card border border-border rounded-2xl p-3" role="region" aria-label="Clientes atendidos hoy">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate">Clientes Atendidos</p>
          <p className="font-medium" aria-label={`Total de clientes atendidos: ${clientsCount ?? 0}`}>
            {!data || data.isLoading ? "..." : clientsCount ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ClientsPanel;
