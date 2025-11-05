import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { useSalonEmployees } from "../../../hooks/useSalonEmployees";
import { useSalonServices } from "../../../hooks/useSalonServices";
import { useTurnos } from "../../../hooks/useTurnos";
import { Appointment } from "./AppointmentCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { toast } from "sonner";

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

  const [formData, setFormData] = useState<Partial<Appointment & {
    discountAmount?: number;
    taxAmount?: number;
    tipAmount?: number;
    paymentMethod?: string;
    directCost?: number;
    bookingSource?: string;
    campaignCode?: string;
    listPrice?: number;
    totalCollected?: number;
  }>>({
    clientName: "",
    date: "",
    time: "",
    status: "pending",
    salonId: defaultSalonId,
    service: "",
    stylist: "",
    discountAmount: 0,
    taxAmount: 0,
    tipAmount: 0,
    paymentMethod: "cash",
    directCost: 0,
    bookingSource: "mostrador",
    campaignCode: "",
    listPrice: 0,
    totalCollected: 0,
  });

  const currentSalonId = (formData.salonId || salonId || undefined) === 'all' ? undefined : (formData.salonId || salonId || undefined);
  const { assignments: salonEmployees, isLoading: loadingEmployees } = useSalonEmployees(currentSalonId, { enabled: open && !!currentSalonId });
  const { services: salonServices, loading: loadingServices } = useSalonServices(currentSalonId, { enabled: open && !!currentSalonId });
  
  // Usar useTurnos para validaciones y acciones
  const { createTurno, updateTurno, validateTurno, checkConflicts } = useTurnos({
    salonId: currentSalonId,
    enabled: open && !!currentSalonId
  });

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
        discountAmount: (appointment as any).discountAmount || 0,
        taxAmount: (appointment as any).taxAmount || 0,
        tipAmount: (appointment as any).tipAmount || 0,
        paymentMethod: (appointment as any).paymentMethod || "cash",
        directCost: (appointment as any).directCost || 0,
        bookingSource: (appointment as any).bookingSource || "mostrador",
        campaignCode: (appointment as any).campaignCode || "",
        listPrice: (appointment as any).listPrice || 0,
        totalCollected: (appointment as any).totalCollected || 0,
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
        discountAmount: 0,
        taxAmount: 0,
        tipAmount: 0,
        paymentMethod: "cash",
        directCost: 0,
        bookingSource: "mostrador",
        campaignCode: "",
        listPrice: 0,
        totalCollected: 0,
      });
    }
  }, [appointment, open, salonId, defaultSalonId]);

  const handleSave = async () => {
    if (!formData.clientName || !formData.date || !formData.time || !formData.service) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    // Si no hay salonId seleccionado o es 'all', usar el primer salón disponible
    let targetSalonId = formData.salonId;
    if (!targetSalonId || targetSalonId === 'all') {
      if (salons && salons.length > 0) {
        targetSalonId = salons[0].id;
        setFormData({ ...formData, salonId: targetSalonId });
      } else {
        toast.error('No hay locales disponibles');
        return;
      }
    }
    
    try {
      // Preparar datos del turno
      const turnoData = {
        clientName: formData.clientName,
        service: formData.service || '',
        date: formData.date,
        time: formData.time,
        status: formData.status || 'pending',
        stylist: formData.stylist || undefined, // Opcional: usar undefined en lugar de string vacío
        salonId: targetSalonId,
        notes: (formData as any).notes || '',
      };
      
      // Validar antes de guardar
      const validation = validateTurno(turnoData);
      if (!validation.valid) {
        toast.error(validation.message || 'Error de validación');
        return;
      }
      
      // Verificar conflictos (solo para nuevos turnos o cuando cambian fecha/hora/empleado)
      if (!appointment || formData.date !== appointment.date || formData.time !== appointment.time || formData.stylist !== appointment.stylist) {
        const conflictCheck = checkConflicts(turnoData, appointment?.id);
        if (!conflictCheck.valid) {
          toast.error(conflictCheck.message || 'Hay un conflicto de horarios');
          return;
        }
      }
      
      // Guardar usando useTurnos
      if (appointment) {
        await updateTurno(appointment.id, turnoData as any);
        toast.success('Turno actualizado correctamente');
      } else {
        await createTurno(turnoData);
        toast.success('Turno creado correctamente');
      }
      
      // Llamar callback original para compatibilidad
      onSave(formData);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error guardando turno:', error);
      toast.error(error?.message || 'Error al guardar el turno');
    }
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
            <Label htmlFor="salon_id">Local</Label>
            <Select
              value={formData.salonId}
              onValueChange={(value) =>
                setFormData({ ...formData, salonId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar local" />
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
                onChange={(e) => {
                  const newDate = e.target.value;
                  setFormData((prev) => ({ ...prev, date: newDate }));
                }}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={formData.time || ""}
                onChange={(e) => {
                  const newTime = e.target.value;
                  setFormData((prev) => ({ ...prev, time: newTime }));
                }}
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

          {appointment && formData.status === 'completed' && (
            <Tabs defaultValue="basic" className="w-full">
              <TabsList>
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="financial">Financiero</TabsTrigger>
              </TabsList>
              
              <TabsContent value="financial" className="space-y-4 mt-4">
                <div className="grid gap-2">
                  <Label htmlFor="list-price">Precio de Lista</Label>
                  <Input
                    id="list-price"
                    type="number"
                    step="0.01"
                    value={formData.listPrice || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, listPrice: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="discount-amount">Descuento</Label>
                  <Input
                    id="discount-amount"
                    type="number"
                    step="0.01"
                    value={formData.discountAmount || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, discountAmount: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tax-amount">Impuestos (IVA)</Label>
                  <Input
                    id="tax-amount"
                    type="number"
                    step="0.01"
                    value={formData.taxAmount || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, taxAmount: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tip-amount">Propina</Label>
                  <Input
                    id="tip-amount"
                    type="number"
                    step="0.01"
                    value={formData.tipAmount || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, tipAmount: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="total-collected">Total Cobrado</Label>
                  <Input
                    id="total-collected"
                    type="number"
                    step="0.01"
                    value={formData.totalCollected || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, totalCollected: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="payment-method">Método de Pago</Label>
                  <Select
                    value={formData.paymentMethod || "cash"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="direct-cost">Costo Directo</Label>
                  <Input
                    id="direct-cost"
                    type="number"
                    step="0.01"
                    value={formData.directCost || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, directCost: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="booking-source">Fuente de Reserva</Label>
                  <Select
                    value={formData.bookingSource || "mostrador"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, bookingSource: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="mostrador">Mostrador</SelectItem>
                      <SelectItem value="campaña">Campaña</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="campaign-code">Código de Campaña/Cupón</Label>
                  <Input
                    id="campaign-code"
                    value={formData.campaignCode || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, campaignCode: e.target.value })
                    }
                    placeholder="Código de promoción..."
                  />
                </div>
              </TabsContent>
            </Tabs>
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
