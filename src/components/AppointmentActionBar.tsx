import { CheckCircle, XCircle } from "lucide-react";
import { Appointment } from "./AppointmentCard";
import { GenericActionBar } from "./GenericActionBar";

interface AppointmentActionBarProps {
  appointment: Appointment | null;
  onClose: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function AppointmentActionBar({ 
  appointment, 
  onClose, 
  onEdit, 
  onComplete, 
  onCancel,
  onDelete 
}: AppointmentActionBarProps) {
  if (!appointment) return null;

  const statusLabels = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    completed: "Completado",
    cancelled: "Cancelado",
  };

  const statusVariants = {
    pending: "outline" as const,
    confirmed: "secondary" as const,
    completed: "default" as const,
    cancelled: "destructive" as const,
  };

  const customActions = [];
  
  if (appointment.status !== "completed") {
    customActions.push({
      label: "Completar",
      onClick: onComplete,
      variant: "ghost" as const,
      icon: <CheckCircle className="h-3.5 w-3.5" />,
    });
  }
  
  if (appointment.status !== "cancelled") {
    customActions.push({
      label: "Cancelar",
      onClick: onCancel,
      variant: "ghost" as const,
      icon: <XCircle className="h-3.5 w-3.5" />,
    });
  }

  return (
    <GenericActionBar
      title={appointment.clientName}
      subtitle={appointment.service}
      badge={{
        text: statusLabels[appointment.status],
        variant: statusVariants[appointment.status],
      }}
      isOpen={true}
      onClose={onClose}
      onEdit={onEdit}
      onDelete={onDelete}
      customActions={customActions}
      detailFields={[
        { label: "Servicio", value: appointment.service },
        { label: "Fecha", value: appointment.date },
        { label: "Hora", value: appointment.time },
        { label: "Estilista", value: appointment.stylist },
        { label: "Estado", value: statusLabels[appointment.status] },
      ]}
    />
  );
}
