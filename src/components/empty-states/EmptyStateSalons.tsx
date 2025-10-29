import React from "react";
import { Building2, MapPin, Plus } from "lucide-react";
import { EmptyState } from "../ui/empty-state";

interface EmptyStateSalonsProps {
  onCreateSalon?: () => void;
  className?: string;
}

export function EmptyStateSalons({
  onCreateSalon,
  className,
}: EmptyStateSalonsProps) {
  return (
    <EmptyState
      icon={Building2}
      title="No hay peluquerías configuradas"
      description="Agregá tu primera sucursal para empezar a gestionar turnos. Podrás configurar servicios, empleados y horarios específicos para cada local."
      actionLabel="Crear primera peluquería"
      onAction={onCreateSalon}
      secondaryActionLabel="Ver ejemplos"
      onSecondaryAction={() => {
        // TODO: open examples modal
        console.log("Mostrar ejemplos de configuración");
      }}
      className={className}
    />
  );
}
