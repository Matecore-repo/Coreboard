import { CheckCircle, XCircle, RefreshCw, Book } from "lucide-react";
import { Appointment } from "./AppointmentCard";
import { GenericActionBar } from "../../GenericActionBar";
import { useEmployees } from "../../../hooks/useEmployees";
import { useSalonServices } from "../../../hooks/useSalonServices";
import { useAuth } from "../../../contexts/AuthContext";
import { useMemo } from "react";

interface AppointmentActionBarProps {
  appointment: Appointment | null;
  onClose: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
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
  onRestore,
  onSetStatus,
}: AppointmentActionBarProps) {
  const { currentOrgId } = useAuth() as any;
  const { employees } = useEmployees(currentOrgId ?? undefined, { enabled: !!currentOrgId });
  const { services: salonServices } = useSalonServices(appointment?.salonId, { enabled: !!appointment?.salonId });

  // Mapear el ID del estilista al nombre legible
  const stylistName = useMemo(() => {
    if (!appointment?.stylist || appointment.stylist === '') {
      return 'Sin asignar';
    }
    const employee = employees.find(e => e.id === appointment.stylist);
    return employee?.full_name || appointment.stylist;
  }, [appointment?.stylist, employees]);

  // Mapear el ID del servicio al nombre legible
  const serviceName = useMemo(() => {
    if (!appointment?.service || appointment.service === '') {
      return 'Sin servicio';
    }
    const service = salonServices.find(s => s.service_id === appointment.service);
    return service?.service_name || appointment.service;
  }, [appointment?.service, salonServices]);

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

  // Añadir acción de estado Confirmado
  const confirmedDisabled = appointment.status === 'confirmed';

  fullCustomActions.push({
    label: 'Confirmado',
    onClick: () => { if (onSetStatus) onSetStatus('confirmed'); },
    variant: 'ghost' as const,
    icon: <Book className="h-3.5 w-3.5" />,
    disabled: confirmedDisabled,
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
      detailFields={[
        { label: "Servicio", value: serviceName },
        { label: "Fecha", value: appointment.date },
        { label: "Hora", value: appointment.time },
        { label: "Estilista", value: stylistName },
        { label: "Estado", value: statusLabels[appointment.status] },
        ...(appointment.notes ? [{ label: "Notas", value: appointment.notes }] : []),
      ]}
    />
  );
}
