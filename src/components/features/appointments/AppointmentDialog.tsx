import { useState, useEffect, useMemo } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../ui/tooltip";
import { CustomDatePicker } from "../../ui/DatePicker";
import { useSalonEmployees } from "../../../hooks/useSalonEmployees";
import { useSalonServices } from "../../../hooks/useSalonServices";
import { useTurnos } from "../../../hooks/useTurnos";
import { Appointment } from "./AppointmentCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";

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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const currentSalonId = (formData.salonId || salonId || undefined) === 'all' ? undefined : (formData.salonId || salonId || undefined);
  const { assignments: salonEmployees, isLoading: loadingEmployees } = useSalonEmployees(currentSalonId, { enabled: open && !!currentSalonId });
  const { services: salonServices, loading: loadingServices } = useSalonServices(currentSalonId, { enabled: open && !!currentSalonId });
  
  // Usar useTurnos para validaciones y acciones
  const { createTurno, updateTurno, validateTurno, checkConflicts } = useTurnos({
    salonId: currentSalonId,
    enabled: open && !!currentSalonId
  });

  // Obtener precio del servicio seleccionado
  const selectedServicePrice = useMemo(() => {
    if (!formData.service) return null;
    const service = salonServices.find(s => s.service_id === formData.service);
    if (!service) return null;
    return service.price_override ?? service.base_price ?? 0;
  }, [formData.service, salonServices]);

  // Validación en tiempo real
  const validateField = (field: string, value: any) => {
    const newErrors: Record<string, string> = { ...errors };
    
    switch (field) {
      case 'clientName':
        if (!value || value.trim().length === 0) {
          newErrors.clientName = 'El nombre del cliente es requerido';
        } else if (value.trim().length < 2) {
          newErrors.clientName = 'El nombre debe tener al menos 2 caracteres';
        } else {
          delete newErrors.clientName;
        }
        break;
      case 'service':
        if (!value) {
          newErrors.service = 'Debes seleccionar un servicio';
        } else {
          delete newErrors.service;
        }
        break;
      case 'date':
        if (!value) {
          newErrors.date = 'La fecha es requerida';
        } else {
          const selectedDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (selectedDate < today) {
            newErrors.date = 'No puedes seleccionar una fecha pasada';
          } else {
            delete newErrors.date;
          }
        }
        break;
      case 'time':
        if (!value) {
          newErrors.time = 'La hora es requerida';
        } else {
          delete newErrors.time;
        }
        break;
      case 'salonId':
        if (!value || value === 'all') {
          newErrors.salonId = 'Debes seleccionar un local';
        } else {
          delete newErrors.salonId;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  // Verificar si el formulario es válido
  const isFormValid = useMemo(() => {
    return !!formData.clientName && 
           !!formData.service && 
           !!formData.date && 
           !!formData.time && 
           !!formData.salonId && 
           formData.salonId !== 'all' &&
           Object.keys(errors).length === 0;
  }, [formData.clientName, formData.service, formData.date, formData.time, formData.salonId, errors]);

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

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field as keyof typeof formData]);
  };

  const handleSave = async () => {
    // Marcar todos los campos como tocados
    const allFields = ['clientName', 'service', 'date', 'time', 'salonId'];
    const newTouched: Record<string, boolean> = {};
    allFields.forEach(field => {
      newTouched[field] = true;
      validateField(field, formData[field as keyof typeof formData]);
    });
    setTouched(newTouched);

    if (!isFormValid) {
      toast.error('Por favor completa todos los campos requeridos correctamente');
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
    
    setIsSaving(true);
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
        paymentMethod: formData.paymentMethod || 'cash',
        total_amount: selectedServicePrice || 0,
        discountAmount: formData.discountAmount || 0,
        taxAmount: formData.taxAmount || 0,
        tipAmount: formData.tipAmount || 0,
        totalCollected: formData.totalCollected || 0,
        directCost: formData.directCost || 0,
        bookingSource: formData.bookingSource || 'mostrador',
        campaignCode: formData.campaignCode || '',
      };
      
      // Validar antes de guardar
      const validation = validateTurno(turnoData);
      if (!validation.valid) {
        toast.error(validation.message || 'Error de validación');
        setIsSaving(false);
        return;
      }
      
      // Verificar conflictos (solo para nuevos turnos o cuando cambian fecha/hora/empleado)
      if (!appointment || formData.date !== appointment.date || formData.time !== appointment.time || formData.stylist !== appointment.stylist) {
        const conflictCheck = checkConflicts(turnoData, appointment?.id);
        if (!conflictCheck.valid) {
          toast.error(conflictCheck.message || 'Hay un conflicto de horarios');
          setIsSaving(false);
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
      // Limpiar errores y touched al cerrar
      setErrors({});
      setTouched({});
    } catch (error: any) {
      console.error('Error guardando turno:', error);
      toast.error(error?.message || 'Error al guardar el turno');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
            <Label htmlFor="salon_id">
              Local <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.salonId}
              onValueChange={(value) => handleFieldChange('salonId', value)}
            >
              <SelectTrigger 
                id="salon_id"
                aria-invalid={touched.salonId && !!errors.salonId}
                className={touched.salonId && errors.salonId ? "border-destructive" : ""}
              >
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
            {touched.salonId && errors.salonId && (
              <p className="text-sm text-destructive">{errors.salonId}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="client_name">
              Nombre del cliente <span className="text-destructive">*</span>
            </Label>
            <Input
              id="client_name"
              value={formData.clientName}
              onChange={(e) => handleFieldChange('clientName', e.target.value)}
              onBlur={() => handleFieldBlur('clientName')}
              placeholder="Juan Pérez"
              aria-invalid={touched.clientName && !!errors.clientName}
              className={touched.clientName && errors.clientName ? "border-destructive" : ""}
            />
            {touched.clientName && errors.clientName && (
              <p className="text-sm text-destructive">{errors.clientName}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="service">
              Servicio <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.service || ""}
              onValueChange={(value) => handleFieldChange('service', value)}
            >
              <SelectTrigger 
                id="service"
                aria-invalid={touched.service && !!errors.service}
                className={touched.service && errors.service ? "border-destructive" : ""}
              >
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
            {touched.service && errors.service && (
              <p className="text-sm text-destructive">{errors.service}</p>
            )}
            {formData.service && selectedServicePrice !== null && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Precio del servicio: <strong className="text-foreground">${selectedServicePrice.toLocaleString()}</strong></span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Este precio se calculará automáticamente al guardar el turno</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">
                Fecha <span className="text-destructive">*</span>
              </Label>
              <CustomDatePicker
                id="date"
                value={formData.date || ""}
                onChange={(value) => handleFieldChange('date', value)}
                onBlur={() => handleFieldBlur('date')}
                placeholder="Selecciona una fecha"
                minDate={new Date()}
                aria-invalid={touched.date && !!errors.date}
                className={touched.date && errors.date ? "border-destructive" : ""}
              />
              {touched.date && errors.date && (
                <p className="text-sm text-destructive">{errors.date}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="time">
                Hora <span className="text-destructive">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                value={formData.time || ""}
                onChange={(e) => handleFieldChange('time', e.target.value)}
                onBlur={() => handleFieldBlur('time')}
                placeholder="HH:MM"
                aria-invalid={touched.time && !!errors.time}
                className={touched.time && errors.time ? "border-destructive" : ""}
              />
              {touched.time && errors.time && (
                <p className="text-sm text-destructive">{errors.time}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="stylist">Estilista (Opcional)</Label>
            <Select
              value={formData.stylist || "none"}
              onValueChange={(value) => {
                setFormData((prev) => ({ ...prev, stylist: value === "none" ? "" : value }));
              }}
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

          <div className="grid gap-2">
            <Label htmlFor="payment-method-main">Método de Pago</Label>
            <Select
              value={formData.paymentMethod || "cash"}
              onValueChange={(value) => {
                setFormData((prev) => ({ ...prev, paymentMethod: value }));
              }}
            >
              <SelectTrigger id="payment-method-main">
                <SelectValue placeholder="Seleccionar método de pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="mercadopago">Mercado Pago</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {appointment && (
            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status || "pending"}
                onValueChange={(value: any) => {
                  setFormData((prev) => ({ ...prev, status: value }));
                }}
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
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, listPrice: parseFloat(e.target.value) || 0 }));
                    }}
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
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }));
                    }}
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
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, taxAmount: parseFloat(e.target.value) || 0 }));
                    }}
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
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, tipAmount: parseFloat(e.target.value) || 0 }));
                    }}
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
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, totalCollected: parseFloat(e.target.value) || 0 }));
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="payment-method">Método de Pago</Label>
                  <Select
                    value={formData.paymentMethod || "cash"}
                    onValueChange={(value) => {
                      setFormData((prev) => ({ ...prev, paymentMethod: value }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="mercadopago">Mercado Pago</SelectItem>
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
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, directCost: parseFloat(e.target.value) || 0 }));
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="booking-source">Fuente de Reserva</Label>
                  <Select
                    value={formData.bookingSource || "mostrador"}
                    onValueChange={(value) => {
                      setFormData((prev) => ({ ...prev, bookingSource: value }));
                    }}
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
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, campaignCode: e.target.value }));
                    }}
                    placeholder="Código de promoción..."
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              setErrors({});
              setTouched({});
            }}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isFormValid || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
