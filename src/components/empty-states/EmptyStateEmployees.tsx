import React from "react";
import { Users, UserPlus, Mail } from "lucide-react";
import { EmptyState } from "../ui/empty-state";

interface EmptyStateEmployeesProps {
  onInviteEmployee?: () => void;
  onBulkImport?: () => void;
  className?: string;
}

export function EmptyStateEmployees({
  onInviteEmployee,
  onBulkImport,
  className,
}: EmptyStateEmployeesProps) {
  return (
    <EmptyState
      icon={Users}
      title="No hay empleados registrados"
      description="Invitá a tu equipo de trabajo para que puedan gestionar turnos, ver su agenda y acceder a reportes personalizados."
      actionLabel="Invitar empleado"
      onAction={onInviteEmployee}
      secondaryActionLabel="Importar desde Excel"
      onSecondaryAction={onBulkImport}
      className={className}
    />
  );
}
