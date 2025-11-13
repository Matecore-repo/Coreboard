import { useCallback, useMemo, useState } from "react";
import { CheckCircle, XCircle, RefreshCw, Book } from "lucide-react";
import { Appointment } from "./AppointmentCard";
import { GenericActionBar } from "../../GenericActionBar";
import { useEmployees } from "../../../hooks/useEmployees";
import { useSalonServices } from "../../../hooks/useSalonServices";
import { useAuth } from "../../../contexts/AuthContext";
import { toastPromise } from "../../../lib/toast";

interface AppointmentActionBarProps {
  appointment: Appointment | null;
  onClose: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onRestore?: (id: string) => Promise<void>;
  onSetStatus?: (status: Appointment["status"]) => Promise<void>;
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
  const [isMutatingStatus, setIsMutatingStatus] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  if (!appointment) return null;

  // Mapear el ID del estilista al nombre legible
  const stylistName =
    !appointment.stylist || appointment.stylist === ""
      ? "Sin asignar"
      : employees.find((e) => e.id === appointment.stylist)?.full_name ?? appointment.stylist;

  // Mapear el ID del servicio al nombre legible
  const serviceName =
    appointment.serviceName ??
    (!appointment.service || appointment.service === ""
      ? "Sin servicio"
      : salonServices.find((s) => s.service_id === appointment.service)?.service_name ?? appointment.service);

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

  // Aseguramos que se muestren todas las acciones pero deshabilitadas si no aplican
  const completeDisabled = appointment.status === "completed";
  const cancelDisabled = appointment.status === "cancelled";

  const runStatusMutation = useCallback(
    async (status: Appointment["status"]) => {
      if (!onSetStatus) {
        return;
      }
      setIsMutatingStatus(true);
      const statusPromise = onSetStatus(status);
      toastPromise(statusPromise, {
        loading: "Actualizando estado...",
        success: `Estado actualizado a ${statusLabels[status]}`,
        error: (error) =>
          error instanceof Error && error.message
            ? error.message
            : "No se pudo actualizar el estado del turno",
      });
      try {
        await statusPromise;
      } finally {
        setIsMutatingStatus(false);
      }
    },
    [onSetStatus],
  );

  const handleStatusClick = useCallback(
    (status: Appointment["status"]) => {
      if (isMutatingStatus) return;
      void runStatusMutation(status);
    },
    [isMutatingStatus, runStatusMutation],
  );

  const handleRestoreClick = useCallback(() => {
    if (!onRestore || isRestoring) return;
    setIsRestoring(true);

    const promise = (async () => {
      try {
        await onRestore(appointment.id);
      } finally {
        setIsRestoring(false);
      }
    })();

    toastPromise(promise, {
      loading: "Restaurando turno...",
      success: "Turno restaurado a pendiente",
      error: (error) =>
        error instanceof Error && error.message
          ? error.message
          : "No se pudo restaurar el turno",
    });
  }, [appointment.id, isRestoring, onRestore]);

  const subtitle = useMemo(() => serviceName, [serviceName]);

  const fullCustomActions = [
    {
      label: "Completar",
      onClick: () => {
        if (!completeDisabled) {
          handleStatusClick("completed");
        }
      },
      variant: "ghost" as const,
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      disabled: completeDisabled || isMutatingStatus,
    },
    {
      label: "Cancelar",
      onClick: () => {
        if (!cancelDisabled) {
          handleStatusClick("cancelled");
        }
      },
      variant: "ghost" as const,
      icon: <XCircle className="h-3.5 w-3.5" />,
      disabled: cancelDisabled || isMutatingStatus,
    },
  ];

  // Añadir 'Restaurar' siempre
  fullCustomActions.push({
    label: "Restaurar",
    onClick: handleRestoreClick,
    variant: "ghost" as const,
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    disabled: isRestoring || isMutatingStatus,
  });

  // Añadir acción de estado Confirmado
  const confirmedDisabled = appointment.status === "confirmed";

  fullCustomActions.push({
    label: "Confirmado",
    onClick: () => {
      if (!confirmedDisabled) {
        handleStatusClick("confirmed");
      }
    },
    variant: "ghost" as const,
    icon: <Book className="h-3.5 w-3.5" />,
    disabled: confirmedDisabled || isMutatingStatus,
  });

  return (
    <GenericActionBar
      title={appointment.clientName}
      subtitle={subtitle}
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
