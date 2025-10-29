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
import { useSalonEmployees } from "../hooks/useSalonEmployees";
import { useSalonServices } from "../hooks/useSalonServices";
import { Appointment as FullAppointment } from "../types";

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
  onSave: (appointment: Partial<FullAppointment>) => void;
  appointment?: FullAppointment | null;
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
  // Si no hay salonId especificado, usar el primer salón disponible
  const defaultSalonId = salonId || (salons && salons.length > 0 ? salons[0].id : "");

  const [formData, setFormData] = useState<Partial<FullAppointment>>({
    client_name: "",
    starts_at: "",
    stylist_id: "",
    status: "pending",
    salon_id: defaultSalonId,
    service_id: "",
    total_amount: 0,
    created_by: "",
  });

  // Estado local para fecha y hora separados
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");

  // Helper to get date and time from starts_at
  const getDateTimeFromStartsAt = (startsAt: string) => {
    if (!startsAt) return { date: "", time: "" };
    const date = new Date(startsAt);
    return {
      date: date.toISOString().split('T')[0],
      time: date.toTimeString().slice(0, 5)
    };
  };

  // Helper to combine date and time into starts_at
  const combineDateTime = (date: string, time: string) => {
    if (!date || !time) return "";
    return `${date}T${time}:00`;
  };

  // Update starts_at when date or time changes
  useEffect(() => {
    if (dateInput && timeInput) {
      const startsAt = combineDateTime(dateInput, timeInput);
      setFormData(prev => ({ ...prev, starts_at: startsAt }));
    }
  }, [dateInput, timeInput]);

  const currentSalonId = formData.salon_id || salonId || undefined;
  const { assignments: salonEmployees, isLoading: loadingEmployees } = useSalonEmployees(currentSalonId, { enabled: open });
  const { services: salonServices, loading: loadingServices } = useSalonServices(currentSalonId, { enabled: open });

  useEffect(() => {
    if (appointment) {
      const { date, time } = getDateTimeFromStartsAt(appointment.starts_at || "");
      setDateInput(date);
      setTimeInput(time);
      setFormData({
        client_name: appointment.client_name || "",
        starts_at: appointment.starts_at || "",
        stylist_id: appointment.stylist_id || "",
        status: appointment.status || "pending",
        salon_id: appointment.salon_id || defaultSalonId,
        service_id: appointment.service_id || "",
        total_amount: appointment.total_amount || 0,
        created_by: appointment.created_by || "",
      });
    } else {
      setDateInput("");
      setTimeInput("");
      setFormData({
        client_name: "",
        starts_at: "",
        stylist_id: "",
        status: "pending",
        salon_id: defaultSalonId,
        service_id: "",
        total_amount: 0,
        created_by: "",
      });
    }
  }, [appointment, open, salonId, defaultSalonId]);

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
            <Label htmlFor="salon_id">Peluquería</Label>
            <Select
              value={formData.salon_id}
              onValueChange={(value) =>
                setFormData({ ...formData, salon_id: value })
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
              value={formData.client_name}
              onChange={(e) =>
                setFormData({ ...formData, client_name: e.target.value })
              }
              placeholder="Juan Pérez"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="service">Servicio</Label>
            <Select
              value={formData.service_id}
              onValueChange={(value) =>
                setFormData({ ...formData, service_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar servicio" />
              </SelectTrigger>
              <SelectContent>
                {loadingServices ? (
                  <SelectItem value="loading" disabled>Cargando servicios...</SelectItem>
                ) : !currentSalonId ? (
                  <SelectItem value="no-salon" disabled>Selecciona una sucursal primero</SelectItem>
                ) : salonServices.length > 0 ? (
                  salonServices.map((svc) => (
                    <SelectItem key={svc.service_id} value={svc.service_id}>
                      {svc.service_name} - ${svc.price_override || svc.base_price}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-services" disabled>No hay servicios asignados a esta sucursal</SelectItem>
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
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stylist">Estilista</Label>
            <Select
              value={formData.stylist_id}
              onValueChange={(value) =>
                setFormData({ ...formData, stylist_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estilista" />
              </SelectTrigger>
              <SelectContent>
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
                ) : (
                  <SelectItem value="no-employees" disabled>No hay empleados asignados a este salón</SelectItem>
                )}
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
