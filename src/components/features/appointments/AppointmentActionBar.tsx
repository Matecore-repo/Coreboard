import { CheckCircle, XCircle, RefreshCw, Book, Clock } from "lucide-react";
import { Appointment } from "./AppointmentCard";
import { GenericActionBar } from "../../GenericActionBar";

interface AppointmentActionBarProps {
  appointment: Appointment | null;
  onClose: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onReschedule?: (payload: { date?: string; time?: string; openPicker?: "date" | "time" }) => void;
  onRestore?: (id: string) => void;
  onSetStatus?: (status: Appointment['status']) => void;
}

export function AppointmentActionBar({ 
  appointment, 
  onClose, 
  onEdit, 
  onComplete, 
  onCancel,
  onDelete,
  onReschedule,
  onRestore,
  onSetStatus,
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

  // Aseguramos que se muestren todas las acciones pero deshabilitadas si no aplican
  const completeDisabled = appointment.status === "completed";
  const cancelDisabled = appointment.status === "cancelled";

  const fullCustomActions = [
    {
      label: "Completar",
      onClick: () => { if (!completeDisabled && onSetStatus) onSetStatus('completed'); },
      variant: "ghost" as const,
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      disabled: completeDisabled,
    },
    {
      label: "Cancelar",
      onClick: () => { if (!cancelDisabled && onSetStatus) onSetStatus('cancelled'); },
      variant: "ghost" as const,
      icon: <XCircle className="h-3.5 w-3.5" />,
      disabled: cancelDisabled,
    },
  ];

  // Añadir 'Restaurar' siempre
  fullCustomActions.push({
    label: "Restaurar",
    onClick: () => { if (onRestore) onRestore(appointment.id); },
    variant: "ghost" as const,
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    disabled: false,
  });

  // Añadir acciones de estado explícitas
  const confirmedDisabled = appointment.status === 'confirmed';
  const pendingDisabled = appointment.status === 'pending';

  fullCustomActions.push({
    label: 'Confirmado',
    onClick: () => { if (onSetStatus) onSetStatus('confirmed'); },
    variant: 'ghost' as const,
    icon: <Book className="h-3.5 w-3.5" />,
    disabled: confirmedDisabled,
  });

  fullCustomActions.push({
    label: 'Pendiente',
    onClick: () => { if (onSetStatus) onSetStatus('pending'); },
    variant: 'ghost' as const,
    icon: <Clock className="h-3.5 w-3.5" />,
    disabled: pendingDisabled,
  });

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
      customActions={fullCustomActions}
      onReschedule={onReschedule}
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
