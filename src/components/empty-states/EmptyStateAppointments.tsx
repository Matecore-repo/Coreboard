import React from "react";
import { Calendar, Plus } from "lucide-react";
import { EmptyState } from "../ui/empty-state";

interface EmptyStateAppointmentsProps {
  onCreateAppointment?: () => void;
  orgName?: string;
  className?: string;
}

export function EmptyStateAppointments({
  onCreateAppointment,
  orgName = "tu peluquería",
  className,
}: EmptyStateAppointmentsProps) {
  return (
    <EmptyState
      icon={Calendar}
      title="No hay turnos programados"
      description={`Empezá a agendar turnos en ${orgName}. Los clientes podrán reservar online y vos podrás gestionar tu agenda fácilmente.`}
      actionLabel="Crear primer turno"
      onAction={onCreateAppointment}
      secondaryActionLabel="Ver tutorial"
      onSecondaryAction={() => {
        // TODO: open tutorial modal
        console.log("Abrir tutorial de turnos");
      }}
      className={className}
    />
  );
}
