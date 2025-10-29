import React from "react";
import { UserCheck, Upload, Search } from "lucide-react";
import { EmptyState } from "../ui/empty-state";

interface EmptyStateClientsProps {
  onAddClient?: () => void;
  onImportClients?: () => void;
  onSyncContacts?: () => void;
  className?: string;
}

export function EmptyStateClients({
  onAddClient,
  onImportClients,
  onSyncContacts,
  className,
}: EmptyStateClientsProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      <EmptyState
        icon={UserCheck}
        title="No hay clientes registrados"
        description="Empezá a construir tu base de clientes. Podrás enviar recordatorios automáticos, hacer seguimiento de preferencias y gestionar fidelización."
        actionLabel="Agregar primer cliente"
        onAction={onAddClient}
        className="max-w-md mx-auto"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
        <EmptyState
          icon={Upload}
          title="Importar clientes"
          description="Subí tu lista de clientes desde Excel o CSV para empezar rápidamente."
          actionLabel="Importar"
          onAction={onImportClients}
          className="h-full"
        />

        <EmptyState
          icon={Search}
          title="Sincronizar contactos"
          description="Conectá con Google Contacts o Outlook para importar tus contactos existentes."
          actionLabel="Sincronizar"
          onAction={onSyncContacts}
          className="h-full"
        />
      </div>
    </div>
  );
}
