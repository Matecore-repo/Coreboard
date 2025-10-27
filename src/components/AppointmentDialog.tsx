import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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
  const [formData, setFormData] = useState<Partial<Appointment>>({
    clientName: "",
    service: "",
    date: "",
    time: "",
    stylist: "",
    status: "pending",
    salonId: salonId || "1",
  });

  useEffect(() => {
    if (appointment) {
      setFormData({
        clientName: appointment.clientName || "",
        service: appointment.service || "",
        date: appointment.date || "",
        time: appointment.time || "",
        stylist: appointment.stylist || "",
        status: appointment.status || "pending",
        salonId: appointment.salonId || salonId || "1",
      });
    } else {
      setFormData({
        clientName: "",
        service: "",
        date: "",
        time: "",
        stylist: "",
        status: "pending",
        salonId: salonId || "1",
      });
    }
  }, [appointment, open, salonId]);

  const handleSave = () => {
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
            <Label htmlFor="salonId">Peluquería</Label>
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
            <Label htmlFor="clientName">Nombre del Cliente</Label>
            <Input
              id="clientName"
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
              value={formData.service}
              onValueChange={(value) =>
                setFormData({ ...formData, service: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {/* Mostrar servicios pasados vía props salons[].services si existen */}
                {salons && salons.length > 0 && salons.find(s => s.id === (formData.salonId || salonId))?.services ? (
                  (salons.find(s => s.id === (formData.salonId || salonId))?.services || []).map((svc: any) => (
                    <SelectItem key={svc.id} value={svc.name}>{svc.name}</SelectItem>
                  ))
                ) : (
                  // Fallback a opciones genéricas si no hay servicios reales
                  <>
                    <SelectItem value="Corte">Corte</SelectItem>
                    <SelectItem value="Coloración">Coloración</SelectItem>
                    <SelectItem value="Peinado">Peinado</SelectItem>
                    <SelectItem value="Tratamiento">Tratamiento</SelectItem>
                    <SelectItem value="Barba">Barba</SelectItem>
                    <SelectItem value="Mechas">Mechas</SelectItem>
                  </>
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
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stylist">Estilista</Label>
            <Select
              value={formData.stylist}
              onValueChange={(value) =>
                setFormData({ ...formData, stylist: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estilista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="María García">María García</SelectItem>
                <SelectItem value="Carlos López">Carlos López</SelectItem>
                <SelectItem value="Ana Martínez">Ana Martínez</SelectItem>
                <SelectItem value="Roberto Silva">Roberto Silva</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {appointment && (
            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
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
