import { useState, useMemo } from "react";
import { User, Calendar, Phone, Download } from "lucide-react";
import { Appointment } from "../AppointmentCard";
import { GenericActionBar } from "../GenericActionBar";
import { EmptyStateClients } from "../empty-states/EmptyStateClients";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";

interface ClientsViewProps {
  appointments: Appointment[];
  selectedSalon: string | null;
}

function ClientsView({ appointments, selectedSalon }: ClientsViewProps) {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedClientName, setEditedClientName] = useState("");
  const [editedClientPhone, setEditedClientPhone] = useState("");
  const [editedClientEmail, setEditedClientEmail] = useState("");
  
  const salonAppointments = !selectedSalon
    ? []
    : appointments.filter((apt) => apt.salonId === selectedSalon);

  // Get unique clients
  const clients = Array.from(
    new Set(salonAppointments.map((apt) => apt.clientName))
  ).map((name) => {
    const clientAppointments = salonAppointments.filter(
      (apt) => apt.clientName === name
    );
    return {
      name,
      appointments: clientAppointments,
      totalAppointments: clientAppointments.length,
      lastVisit: clientAppointments.sort((a, b) =>
        b.date.localeCompare(a.date)
      )[0]?.date,
      completedAppointments: clientAppointments.filter(apt => apt.status === "completed").length,
      pendingAppointments: clientAppointments.filter(apt => apt.status === "pending").length,
      confirmedAppointments: clientAppointments.filter(apt => apt.status === "confirmed").length,
      cancelledAppointments: clientAppointments.filter(apt => apt.status === "cancelled").length,
    };
  });

  const selectedClientData = useMemo(
    () => selectedClient ? clients.find(c => c.name === selectedClient) : null,
    [selectedClient, clients]
  );

  const statusLabels = {
    pending: "Pendiente",
    confirmed: "Confirmado",
    completed: "Completado",
    cancelled: "Cancelado",
  };

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    confirmed: "default",
    completed: "secondary",
    cancelled: "destructive",
  };

  const exportClientsCSV = () => {
    if (clients.length === 0) {
      toast.error("No hay clientes para exportar");
      return;
    }

    const csvData = clients.map(client => ({
      nombre: client.name,
      totalTurnos: client.totalAppointments,
      completados: client.completedAppointments,
      pendientes: client.pendingAppointments,
      confirmados: client.confirmedAppointments,
      cancelados: client.cancelledAppointments,
      ultimaVisita: client.lastVisit,
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success("Datos de clientes exportados");
  };

  const handleEditClient = () => {
    if (selectedClient) {
      setEditedClientName(selectedClient);
      setEditedClientPhone("+54 11 1234-5678"); // Mock data
      setEditedClientEmail("cliente@email.com"); // Mock data
      setEditDialogOpen(true);
    }
  };

  const handleSaveClientEdit = () => {
    if (!editedClientName.trim()) {
      toast.error("El nombre del cliente es requerido");
      return;
    }
    
    // En una aplicación real, aquí se actualizarían los datos del cliente
    toast.success(`Cliente "${editedClientName}" actualizado correctamente`);
    setEditDialogOpen(false);
    setSelectedClient(null);
  };

  const clientDetails = selectedClientData ? [
    { label: "Total de Turnos", value: selectedClientData.totalAppointments.toString() },
    { label: "Completados", value: selectedClientData.completedAppointments.toString() },
    { label: "Confirmados", value: selectedClientData.confirmedAppointments.toString() },
    { label: "Pendientes", value: selectedClientData.pendingAppointments.toString() },
    { label: "Cancelados", value: selectedClientData.cancelledAppointments.toString() },
    { label: "Última Visita", value: selectedClientData.lastVisit },
    { 
      label: "Próximos Turnos", 
      value: (
        <div className="space-y-1">
          {selectedClientData.appointments
            .filter(apt => apt.status === "pending" || apt.status === "confirmed")
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 3)
            .map((apt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Badge variant={statusVariants[apt.status]} className="text-[10px] px-1.5 py-0">
                  {statusLabels[apt.status as keyof typeof statusLabels]}
                </Badge>
                <span>{apt.date} - {apt.time} - {apt.service}</span>
              </div>
            ))}
        </div>
      ) 
    },
  ] : [];

  // Si no hay salón seleccionado, mostrar mensaje
  if (!selectedSalon) {
    return (
      <div className="bg-muted/20 min-h-screen">
        <div className="p-4 md:p-6 pb-20">
          <div className="mb-4">
            <h2>Gestión de Clientes</h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              Administra los clientes de tus peluquerías
            </p>
          </div>
          <div className="text-center py-16 px-4">
            <div className="text-muted-foreground mb-2">
              Por favor selecciona una peluquería para ver los clientes
            </div>
            <p className="text-sm text-muted-foreground">
              Usa el selector de peluquería en la sección de Turnos o Finanzas
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/20 min-h-screen">
      <div className="p-4 md:p-6 pb-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <div>
            <h2>Gestión de Clientes</h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              {clients.length} {clients.length === 1 ? "cliente registrado" : "clientes registrados"}
            </p>
          </div>
          <Button onClick={exportClientsCSV} variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {clients.length === 0 ? (
          <EmptyStateClients
            onAddClient={() => {
              // TODO: implement add client
              toast.info("Agregar cliente próximamente");
            }}
            onImportClients={() => {
              // TODO: implement import
              toast.info("Importar clientes próximamente");
            }}
            onSyncContacts={() => {
              // TODO: implement sync
              toast.info("Sincronizar contactos próximamente");
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clients.map((client) => (
            <div
              key={client.name}
              onClick={() => setSelectedClient(client.name)}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="mb-1 truncate">{client.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {client.totalAppointments} turnos
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0"
                    >
                      {client.completedAppointments} completados
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground truncate text-xs">
                      Última visita: {client.lastVisit}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}

        {/* Edit Client Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
              <DialogDescription>
                Modifica la información del cliente seleccionado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Nombre</Label>
                <Input
                  id="client-name"
                  value={editedClientName}
                  onChange={(e) => setEditedClientName(e.target.value)}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Teléfono</Label>
                <Input
                  id="client-phone"
                  value={editedClientPhone}
                  onChange={(e) => setEditedClientPhone(e.target.value)}
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={editedClientEmail}
                  onChange={(e) => setEditedClientEmail(e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveClientEdit}>
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generic Action Bar */}
        <GenericActionBar
          title={selectedClient || ""}
          subtitle={`${selectedClientData?.totalAppointments || 0} turnos registrados`}
          badge={{
            text: selectedClientData?.completedAppointments 
              ? `${selectedClientData.completedAppointments} completados` 
              : "Sin turnos",
            variant: "secondary",
          }}
          isOpen={selectedClient !== null}
          onClose={() => setSelectedClient(null)}
          onEdit={handleEditClient}
          onDelete={() => {
            if (confirm(`¿Estás seguro de eliminar al cliente "${selectedClient}"?`)) {
              toast.success(`Cliente "${selectedClient}" eliminado`);
              setSelectedClient(null);
            }
          }}
          detailFields={clientDetails}
        />
      </div>
    </div>
  );
}

export default ClientsView;
