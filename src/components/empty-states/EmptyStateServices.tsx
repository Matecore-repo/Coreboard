import React from "react";
import { Scissors, Plus } from "lucide-react";
import { EmptyState } from "../ui/empty-state";

interface EmptyStateServicesProps {
  salonName?: string;
  onCreateService?: () => void;
  className?: string;
}

export function EmptyStateServices({
  salonName,
  onCreateService,
  className,
}: EmptyStateServicesProps) {
  const title = salonName
    ? `No hay servicios en ${salonName}`
    : "No hay servicios configurados";

  const description = salonName
    ? `Agregá los servicios que ofrecés en ${salonName} para que los clientes puedan reservar turnos.`
    : "Configurá los servicios que ofrecés para que los clientes puedan reservar turnos.";

  return (
    <EmptyState
      icon={Scissors}
      title={title}
      description={description}
      actionLabel="Crear primer servicio"
      onAction={onCreateService}
      secondaryActionLabel="Importar servicios"
      onSecondaryAction={() => {
        // TODO: open import modal
        console.log("Abrir importador de servicios");
      }}
      className={className}
    />
  );
}
