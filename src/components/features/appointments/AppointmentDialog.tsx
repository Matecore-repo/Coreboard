import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { useSalonEmployees } from "../../../hooks/useSalonEmployees";
import { useSalonServices } from "../../../hooks/useSalonServices";
import { Appointment } from "./AppointmentCard";

interface Salon {
  id: string;
  name: string;
  address: string;
  image: string;
  staff?: string[];
  services?: { id: string; name: string; price: number; durationMinutes: number }[];
}

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (appointment: Partial<Appointment>) => void;
  appointment?: Appointment | null;
  salonId: string | null;
  salons: Salon[];
}

export function AppointmentDialog({
  open,
  onOpenChange,
  onSave,
  appointment,
  salonId,
  salons,
}: AppointmentDialogProps) {
  const defaultSalonId = (salonId && salonId !== 'all') ? salonId : (salons && salons.length > 0 ? salons[0].id : "");

  const [formData, setFormData] = useState<Partial<Appointment>>({
    clientName: "",
    date: "",
    time: "",
    status: "pending",
    salonId: defaultSalonId,
    service: "",
    stylist: "",
  });

  const currentSalonId = (formData.salonId || salonId || undefined) === 'all' ? undefined : (formData.salonId || salonId || undefined);
  const { assignments: salonEmployees, isLoading: loadingEmployees } = useSalonEmployees(currentSalonId, { enabled: open && !!currentSalonId });
  const { services: salonServices, loading: loadingServices } = useSalonServices(currentSalonId, { enabled: open && !!currentSalonId });

  useEffect(() => {
    if (appointment) {
      setFormData({
        clientName: appointment.clientName || "",
        date: appointment.date || "",
        time: appointment.time || "",
        status: appointment.status || "pending",
        salonId: appointment.salonId || defaultSalonId,
        service: appointment.service || "",
        stylist: appointment.stylist || "",
      });
    } else {
      setFormData({
        clientName: "",
        date: "",
        time: "",
        status: "pending",
        salonId: defaultSalonId,
        service: "",
        stylist: "",
      });
    }
  }, [appointment, open, salonId, defaultSalonId]);

  const handleSave = () => {
    if (!formData.clientName || !formData.date || !formData.time) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }
    if (!formData.salonId || formData.salonId === 'all') {
      alert('Selecciona una peluquería');
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Editar Turno" : "Nuevo Turno"}
          </DialogTitle>
          <DialogDescription>
            {appointment 
              ? "Modifica los detalles del turno existente." 
              : "Completa el formulario para crear un nuevo turno."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="salon_id">Peluquería</Label>
            <Select
              value={formData.salonId}
              onValueChange={(value) =>
                setFormData({ ...formData, salonId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar peluquería" />
              </SelectTrigger>
              <SelectContent>
                {salons.map((salon) => (
                  <SelectItem key={salon.id} value={salon.id}>
                    {salon.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client_name">Nombre del cliente</Label>
            <Input
              id="client_name"
              value={formData.clientName}
              onChange={(e) =>
                setFormData({ ...formData, clientName: e.target.value })
              }
              placeholder="Juan Pérez"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="service">Servicio</Label>
            <Select
              value={formData.service || ""}
              onValueChange={(value) =>
                setFormData({ ...formData, service: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {loadingServices ? (
                  <SelectItem value="loading" disabled>Cargando servicios...</SelectItem>
                ) : salonServices.length > 0 ? (
                  salonServices.map((svc) => (
                    <SelectItem key={svc.service_id} value={svc.service_id}>
                      {svc.service_name} - ${svc.price_override || svc.base_price}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-services" disabled>No hay servicios asignados</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={formData.date || ""}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={formData.time || ""}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stylist">Estilista (Opcional)</Label>
            <Select
              value={formData.stylist || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, stylist: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estilista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {loadingEmployees ? (
                  <SelectItem value="loading-employees" disabled>Cargando empleados...</SelectItem>
                ) : salonEmployees.length > 0 ? (
                  salonEmployees.map((assignment) => (
                    <SelectItem
                      key={assignment.employee_id}
                      value={assignment.employee_id}
                    >
                      {assignment.employees?.full_name || `Empleado ${assignment.employee_id.substring(0, 8)}`}
                    </SelectItem>
                  ))
                ) : null}
              </SelectContent>
            </Select>
          </div>

          {appointment && (
            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status || "pending"}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
